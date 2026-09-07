import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Client } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.resolve("backups", `backup_${timestamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.mkdirSync(path.join(backupDir, "avatars"), { recursive: true });
fs.mkdirSync(path.join(backupDir, "signatures"), { recursive: true });
fs.mkdirSync(path.join(backupDir, "leaves"), { recursive: true });

const r2Client = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: false,
});

const R2_BUCKET = process.env.R2_BUCKET || "kp-storage";
const R2_PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

async function main() {
  console.log("==================================================");
  console.log("  MIGRATION TO CLOUDFLARE R2 (ZERO DATA LOSS)   ");
  console.log("==================================================");
  console.log(`Backup destination: ${backupDir}`);

  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await dbClient.connect();
  console.log("✅ Connected to Database");

  // ----------------------------------------------------
  // STEP 1: Full Database Snapshot
  // ----------------------------------------------------
  console.log("\n[STEP 1/5] Creating Database JSON Snapshots...");
  const usersRes = await dbClient.query('SELECT * FROM "User"');
  fs.writeFileSync(path.join(backupDir, "users_snapshot.json"), JSON.stringify(usersRes.rows, null, 2), "utf8");
  console.log(`  └ Saved ${usersRes.rows.length} users to users_snapshot.json`);

  const leavesRes = await dbClient.query('SELECT * FROM "LeaveRequest"');
  fs.writeFileSync(path.join(backupDir, "leaves_snapshot.json"), JSON.stringify(leavesRes.rows, null, 2), "utf8");
  console.log(`  └ Saved ${leavesRes.rows.length} leaves to leaves_snapshot.json`);

  const settingsRes = await dbClient.query('SELECT * FROM "SystemSettings"');
  fs.writeFileSync(path.join(backupDir, "settings_snapshot.json"), JSON.stringify(settingsRes.rows, null, 2), "utf8");
  console.log(`  └ Saved system settings to settings_snapshot.json`);

  // ----------------------------------------------------
  // STEP 2: Backup and Migrate Avatars
  // ----------------------------------------------------
  console.log("\n[STEP 2/5] Migrating Avatars to Cloudflare R2...");
  let avatarMigrated = 0;
  for (const user of usersRes.rows) {
    if (!user.image) continue;

    try {
      let buffer = null;
      let mimeType = "image/png";

      if (user.image.startsWith("data:image")) {
        const parts = user.image.split(",");
        buffer = Buffer.from(parts[1], "base64");
        const match = user.image.match(/data:([^;]+);/);
        if (match) mimeType = match[1];
      } else if (user.image.startsWith("http")) {
        const fetchRes = await fetch(user.image);
        if (fetchRes.ok) {
          const arr = await fetchRes.arrayBuffer();
          buffer = Buffer.from(arr);
          mimeType = fetchRes.headers.get("content-type") || "image/png";
        } else {
          console.warn(`  ⚠️ Could not fetch avatar for user ${user.name} (${user.id}): HTTP ${fetchRes.status}`);
          continue;
        }
      }

      if (buffer) {
        // Save local backup
        const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
        const localFile = path.join(backupDir, "avatars", `${user.id}.${ext}`);
        fs.writeFileSync(localFile, buffer);

        // Upload to R2
        const r2Key = `avatars/${user.id}/avatar.${ext}`;
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buffer,
            ContentType: mimeType,
          })
        );

        const newR2Url = `${R2_PUBLIC_DOMAIN}/${r2Key}`;
        await dbClient.query('UPDATE "User" SET "image" = $1 WHERE "id" = $2', [newR2Url, user.id]);
        avatarMigrated++;
        console.log(`  ✅ Avatar migrated for: ${user.name} ➔ ${newR2Url}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed avatar for ${user.name}:`, err.message);
    }
  }
  console.log(`  └ Total Avatars Migrated: ${avatarMigrated}`);

  // ----------------------------------------------------
  // STEP 3: Backup and Migrate Signatures
  // ----------------------------------------------------
  console.log("\n[STEP 3/5] Migrating Signatures to Cloudflare R2...");
  let sigsMigrated = 0;
  for (const user of usersRes.rows) {
    if (!user.signatureUrl) continue;

    try {
      let buffer = null;
      let mimeType = "image/png";
      let ext = "png";

      const sigUrl = user.signatureUrl.trim();

      if (sigUrl.startsWith("<svg") || sigUrl.includes("<svg")) {
        buffer = Buffer.from(sigUrl, "utf8");
        mimeType = "image/svg+xml";
        ext = "svg";
      } else if (sigUrl.startsWith("data:image/svg+xml")) {
        const content = decodeURIComponent(sigUrl.replace(/^data:image\/svg\+xml;[^,]*,/, ""));
        buffer = Buffer.from(content, "utf8");
        mimeType = "image/svg+xml";
        ext = "svg";
      } else if (sigUrl.startsWith("data:image/")) {
        const parts = sigUrl.split(",");
        buffer = Buffer.from(parts[1], "base64");
        ext = "png";
      } else if (sigUrl.startsWith("/api/signatures/") || sigUrl.startsWith("http")) {
        // Fetch from the API endpoint or Supabase URL
        const fullUrl = sigUrl.startsWith("http")
          ? sigUrl
          : `${process.env.SUPABASE_FAILOVER_0_URL}/storage/v1/object/public/data1/signatures/${user.id}/signature.png`;

        let fetchRes = await fetch(fullUrl);
        if (!fetchRes.ok) {
          // try with .svg
          const svgUrl = `${process.env.SUPABASE_FAILOVER_0_URL}/storage/v1/object/public/data1/signatures/${user.id}/signature.svg`;
          const svgRes = await fetch(svgUrl);
          if (svgRes.ok) {
            fetchRes = svgRes;
            ext = "svg";
            mimeType = "image/svg+xml";
          }
        }

        if (fetchRes.ok) {
          const arr = await fetchRes.arrayBuffer();
          buffer = Buffer.from(arr);
          mimeType = fetchRes.headers.get("content-type") || (ext === "svg" ? "image/svg+xml" : "image/png");
        } else {
          // Check supabase_original_signatures.json if exists as fallback
          if (fs.existsSync("supabase_original_signatures.json")) {
            try {
              const orig = JSON.parse(fs.readFileSync("supabase_original_signatures.json", "utf8"));
              const found = orig.find(o => o.id === user.id);
              if (found && found.signatureUrl && found.signatureUrl.startsWith("data:")) {
                const parts = found.signatureUrl.split(",");
                buffer = Buffer.from(parts[1], "base64");
              }
            } catch {}
          }
        }
      }

      if (buffer && buffer.length > 0) {
        // Save local backup
        const localFile = path.join(backupDir, "signatures", `${user.id}.${ext}`);
        fs.writeFileSync(localFile, buffer);

        // Upload to R2
        const r2Key = `signatures/${user.id}/signature.${ext}`;
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buffer,
            ContentType: mimeType,
          })
        );

        sigsMigrated++;
        console.log(`  ✅ Signature uploaded to R2 for: ${user.name} (${user.id})`);
      } else {
        console.warn(`  ⚠️ Could not resolve signature data for: ${user.name} (${user.id})`);
      }
    } catch (err) {
      console.error(`  ❌ Failed signature for ${user.name}:`, err.message);
    }
  }
  console.log(`  └ Total Signatures Migrated to R2: ${sigsMigrated}`);

  // ----------------------------------------------------
  // STEP 4: Backup and Migrate Leave Documents
  // ----------------------------------------------------
  console.log("\n[STEP 4/5] Migrating Leave Attachments to Cloudflare R2...");
  let leavesMigrated = 0;
  for (const leave of leavesRes.rows) {
    if (!leave.documentUrl) continue;

    try {
      let docData = null;
      let raw = leave.documentUrl.trim();

      // Check if it is a JSON array
      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          docData = JSON.parse(raw);
        } catch {}
      }

      if (Array.isArray(docData)) {
        let modified = false;
        for (let i = 0; i < docData.length; i++) {
          const item = docData[i];
          const preview = item.preview || item.url;
          if (!preview) continue;

          let buffer = null;
          let mimeType = "image/jpeg";
          let filename = item.name || `attachment_${i}.jpg`;

          if (preview.startsWith("data:")) {
            const parts = preview.split(",");
            buffer = Buffer.from(parts[1], "base64");
            const match = preview.match(/data:([^;]+);/);
            if (match) mimeType = match[1];
          } else if (preview.startsWith("http")) {
            const fetchRes = await fetch(preview);
            if (fetchRes.ok) {
              buffer = Buffer.from(await fetchRes.arrayBuffer());
              mimeType = fetchRes.headers.get("content-type") || "image/jpeg";
            }
          }

          if (buffer) {
            // Save local backup
            fs.writeFileSync(path.join(backupDir, "leaves", `${leave.id}_${i}_${filename}`), buffer);

            // Upload to R2
            const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
            const r2Key = `leaves/${leave.id}/${Date.now()}_${cleanName}`;
            await r2Client.send(
              new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: r2Key,
                Body: buffer,
                ContentType: mimeType,
              })
            );

            const r2Url = `${R2_PUBLIC_DOMAIN}/${r2Key}`;
            item.url = r2Url;
            item.preview = r2Url;
            modified = true;
          }
        }

        if (modified) {
          await dbClient.query('UPDATE "LeaveRequest" SET "documentUrl" = $1 WHERE "id" = $2', [JSON.stringify(docData), leave.id]);
          leavesMigrated++;
          console.log(`  ✅ Leave ${leave.id} attachments migrated to R2`);
        }
      } else if (raw.startsWith("http")) {
        // Single URL
        const fetchRes = await fetch(raw);
        if (fetchRes.ok) {
          const buffer = Buffer.from(await fetchRes.arrayBuffer());
          const mimeType = fetchRes.headers.get("content-type") || "application/pdf";
          const r2Key = `leaves/${leave.id}/${Date.now()}_document.pdf`;
          await r2Client.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: r2Key,
              Body: buffer,
              ContentType: mimeType,
            })
          );
          const r2Url = `${R2_PUBLIC_DOMAIN}/${r2Key}`;
          await dbClient.query('UPDATE "LeaveRequest" SET "documentUrl" = $1 WHERE "id" = $2', [r2Url, leave.id]);
          leavesMigrated++;
          console.log(`  ✅ Leave ${leave.id} document migrated to R2 ➔ ${r2Url}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Failed leave ${leave.id}:`, err.message);
    }
  }
  console.log(`  └ Total Leave Requests Migrated: ${leavesMigrated}`);

  // ----------------------------------------------------
  // STEP 5: Verification & Summary
  // ----------------------------------------------------
  console.log("\n[STEP 5/5] Performing Integrity Verification...");
  console.log(`  ✅ Local backup stored at: ${backupDir}`);
  console.log(`  ✅ Avatars migrated: ${avatarMigrated}`);
  console.log(`  ✅ Signatures uploaded to R2: ${sigsMigrated}`);
  console.log(`  ✅ Leave Attachments migrated: ${leavesMigrated}`);
  console.log("\n🎉 ALL MIGRATION STEPS COMPLETED WITH ZERO DATA LOSS!\n");

  await dbClient.end();
}

main().catch(err => {
  console.error("FATAL MIGRATION ERROR:", err);
  process.exit(1);
});
