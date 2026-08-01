"use client";

import { useState } from "react";
import { Save, RefreshCw, Globe, Building } from "lucide-react";

type MemoSection = { id: string; name: string; code: string };
type UserListType = { id: string; name: string; position: string | null };

type InboundFormProps = {
  sections: MemoSection[];
  users: UserListType[];
  savingReceive: boolean;
  scraping: boolean;
  onScrape: (url: string) => Promise<{
    subject?: string;
    bookNo?: string;
    from?: string;
    amssOriginId?: string | null;
  } | null>;
  onSubmit: (data: {
    senderOrg: string;
    docRefNo?: string;
    title: string;
    urgencyLevel: string;
    amssLink?: string;
    attachmentUrl?: string;
    memoSectionId?: string;
    note?: string;
    firstAssigneeId?: string;
    amssOriginId?: string | null;
  }) => Promise<void>;
};

export default function InboundForm({
  sections,
  users,
  savingReceive,
  scraping,
  onScrape,
  onSubmit,
}: InboundFormProps) {
  const [formData, setFormData] = useState({
    amssLink: "",
    title: "",
    senderOrg: "",
    docRefNo: "",
    urgencyLevel: "NORMAL",
    memoSectionId: "",
    firstAssigneeId: "",
    attachmentUrl: "",
    note: "",
    amssOriginId: "",
  });

  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!formData.amssLink.trim()) return;
    setScrapeError(null);
    try {
      const details = await onScrape(formData.amssLink.trim());
      if (details) {
        setFormData(prev => ({
          ...prev,
          title: details.subject || prev.title,
          docRefNo: details.bookNo || prev.docRefNo,
          senderOrg: details.from || prev.senderOrg,
          amssOriginId: details.amssOriginId || prev.amssOriginId,
        }));
      }
    } catch (err: any) {
      setScrapeError(err.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ•เธดเธ”เธ•เนเธญเธฃเธฐเธเธ AMSS++ เนเธ”เนเนเธเธเธ“เธฐเธเธตเน เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเน€เธญเธเธ”เนเธงเธขเธกเธทเธญ");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (savingReceive) return;
    onSubmit({
      senderOrg: formData.senderOrg.trim(),
      docRefNo: formData.docRefNo.trim() || undefined,
      title: formData.title.trim(),
      urgencyLevel: formData.urgencyLevel,
      amssLink: formData.amssLink.trim() || undefined,
      attachmentUrl: formData.attachmentUrl.trim() || undefined,
      memoSectionId: formData.memoSectionId || undefined,
      note: formData.note.trim() || undefined,
      firstAssigneeId: formData.firstAssigneeId || undefined,
      amssOriginId: formData.amssOriginId.trim() || undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-extrabold text-slate-850 dark:text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-indigo-500" />
          เธฅเธเธ—เธฐเน€เธเธตเธขเธเธฃเธฑเธเธซเธเธฑเธเธชเธทเธญเธฃเธฒเธเธเธฒเธฃเธ เธฒเธขเธเธญเธ
        </h3>
      </div>

      <div className="space-y-4">
        {/* AMSS Link Scraping Input */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 space-y-2">
          <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 block">
            เธเธณเน€เธเนเธฒเธเนเธญเธกเธนเธฅเธ”เนเธงเธเธเธฒเธเธฅเธดเธเธเน AMSS++
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="เธงเธฒเธเธฅเธดเธเธเนเธซเธเนเธฒ bookdetail_receive_sch.php..."
              value={formData.amssLink}
              onChange={(e) => setFormData({ ...formData, amssLink: e.target.value })}
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={handleScrape}
              disabled={scraping || !formData.amssLink.trim()}
              className="px-4 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {scraping ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              เธ”เธถเธเธเนเธญเธกเธนเธฅเธ”เนเธงเธ
            </button>
          </div>
          {scrapeError && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold mt-1">
              โ ๏ธ {scrapeError}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
              เน€เธฃเธทเนเธญเธ (เธเธทเนเธญเน€เธญเธเธชเธฒเธฃ) *
            </label>
            <input
              type="text"
              required
              placeholder="เธฃเธฐเธเธธเธเธทเนเธญเน€เธฃเธทเนเธญเธเธเธญเธเน€เธญเธเธชเธฒเธฃเธฃเธฒเธเธเธฒเธฃ"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-10 px-3.5 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
                เธซเธเนเธงเธขเธเธฒเธเธเธนเนเธชเนเธ (เธเธฒเธ) *
              </label>
              <input
                type="text"
                required
                placeholder="เน€เธเนเธ เธชเธเธก.เธญเธธเธ”เธฃเธเธฒเธเธต"
                value={formData.senderOrg}
                onChange={(e) => setFormData({ ...formData, senderOrg: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
                เน€เธฅเธเธ—เธตเนเธซเธเธฑเธเธชเธทเธญเธฃเธฒเธเธเธฒเธฃเธ•เนเธเธ—เธฒเธ (เธ—เธตเน)
              </label>
              <input
                type="text"
                placeholder="เน€เธเนเธ เธจเธ 04002/เธง..."
                value={formData.docRefNo}
                onChange={(e) => setFormData({ ...formData, docRefNo: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
                เธเธงเธฒเธกเน€เธฃเนเธเธ”เนเธงเธ
              </label>
              <select
                value={formData.urgencyLevel}
                onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="NORMAL">เธเธเธ•เธด</option>
                <option value="URGENT">เธ”เนเธงเธ</option>
                <option value="URGENT_MORE">เธ”เนเธงเธเธกเธฒเธ</option>
                <option value="URGENT_MOST">เธ”เนเธงเธเธ—เธตเนเธชเธธเธ”</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
                เธซเธกเธงเธ”เธเธฒเธเธ—เธตเนเธกเธญเธเธซเธกเธฒเธข
              </label>
              <select
                value={formData.memoSectionId}
                onChange={(e) => setFormData({ ...formData, memoSectionId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- เนเธกเนเธเธฑเธ”เธซเธกเธงเธ” --</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
                เธชเนเธเธ•เนเธญเธเธนเนเธเธเธดเธเธฑเธ•เธด (เธเธฑเนเธเธ—เธตเน 1)
              </label>
              <select
                value={formData.firstAssigneeId}
                onChange={(e) => setFormData({ ...formData, firstAssigneeId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- เน€เธเนเธเนเธงเนเธเนเธญเธ --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position || "เธ—เธฑเนเธงเนเธ"})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
              เธฅเธดเธเธเนเนเธเธฅเนเนเธเธเน€เธเธดเนเธกเน€เธ•เธดเธก (เน€เธเนเธ Google Drive)
            </label>
            <input
              type="url"
              placeholder="เน€เธเนเธ https://drive.google.com/..."
              value={formData.attachmentUrl}
              onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
              className="w-full h-10 px-3.5 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-0.5 block">
              เธซเธกเธฒเธขเน€เธซเธ•เธธเน€เธเธดเนเธกเน€เธ•เธดเธก
            </label>
            <textarea
              placeholder="เธเธฃเธญเธเธซเธกเธฒเธขเน€เธซเธ•เธธ (เธ–เนเธฒเธกเธต)..."
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full p-3 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={savingReceive}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {savingReceive ? "เธเธณเธฅเธฑเธเธฅเธเธ—เธฐเน€เธเธตเธขเธเธฃเธฑเธ..." : "เธฅเธเธ—เธฐเน€เธเธตเธขเธเธฃเธฑเธเนเธฅเธฐเธชเนเธเธ•เนเธญเน€เธเธฉเธตเธขเธ"}
          </button>
        </form>
      </div>
    </div>
  );
}
