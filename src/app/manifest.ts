import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KP e-Leave | โรงเรียนกุดจับประชาสรรค์",
    short_name: "KP e-Leave",
    description: "ระบบบริหารสถานศึกษาและระบบการลาออนไลน์ โรงเรียนกุดจับประชาสรรค์",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#163A66",
    theme_color: "#163A66",
    icons: [
      {
        src: "/images/teacher/school_logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/teacher/school_logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
