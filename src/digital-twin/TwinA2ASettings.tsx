import { useState } from "react";
import { ArrowRightLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { CURRENT_USER } from "../role-center/demoAccount";
import { Dialog } from "../role-center/ui";

type SettingKey = "start" | "clarify" | "progress" | "deliver";
type Settings = Record<SettingKey, boolean>;
const defaults: Settings = { start: true, clarify: true, progress: true, deliver: false };
const key = () => `comac-a2a-settings-v1:${CURRENT_USER}`;
const rows: { id: SettingKey; title: string; automatic: string; manual: string; description: string }[] = [
  { id: "start", title: "自主开工", automatic: "符合条件时自动开始", manual: "每次先由我确认", description: "任务明确、属于本人工作范围且具备所需资料和权限时，可查询、分析并生成草稿。条件不满足时先澄清。" },
  { id: "clarify", title: "补充信息追问", automatic: "允许自动追问", manual: "发送前由我确认", description: "仅向本次协作参与人询问缺失信息，不自动附带个人资料或成果文件。" },
  { id: "progress", title: "进展回复", automatic: "允许自动回复已核实进展", manual: "发送前由我确认", description: "仅回复有依据的处理进展；不代你承诺交付时间，也不将草稿生成说成业务任务完成。" },
  { id: "deliver", title: "成果发送", automatic: "允许自动发送给本次协作参与人", manual: "发送前由我确认", description: "仅发送本次协作明确要求、接收人有权查看的成果。新增接收人或发送范围不清时，仍先由你确认。" },
];
function read(): Settings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key()) || "{}") }; }
  catch { return defaults; }
}
export default function TwinA2ASettings() {
  const [saved, setSaved] = useState(read);
  const [draft, setDraft] = useState(saved);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const changed = rows.some(({ id }) => saved[id] !== draft[id]);
  const close = () => { if (!changed || window.confirm("放弃未保存的协作设置？")) setOpen(false); };
  return <section className="flat-section twin-a2a-section">
    <div className="heading"><h2>A2A 协作</h2></div>
    <button className="twin-a2a-entry" onClick={() => { setDraft({ ...saved }); setOpen(true); }}>
      <i><ArrowRightLeft size={21} /></i><span><strong>协作设置</strong><small>决定分身何时自主处理，何时先问你</small><em>{saved.start ? "符合条件自动开工" : "开工需确认"} · {saved.deliver ? "成果可自动发送" : "成果发送需确认"}</em></span><ChevronRight size={18} />
    </button>
    {notice && <p className="twin-a2a-notice" role="status">{notice}</p>}
    {open && <Dialog title="A2A 协作设置" onClose={close} wide footer={<>
      <button onClick={() => setDraft({ ...defaults })}>恢复默认</button><button onClick={close}>取消</button>
      <button className="rc-primary" disabled={!changed} onClick={() => { localStorage.setItem(key(), JSON.stringify(draft)); setSaved({ ...draft }); setOpen(false); setNotice("协作设置已保存"); }}>保存设置</button>
    </>}>
      <div className="twin-a2a-body">
        <p>这些设置控制你的分身如何处理收到的协作事项，适用于单人和多人协作。</p>
        {rows.map((row) => <div className="twin-a2a-row" key={row.id}>
          <div><strong>{row.title}</strong><p>{row.description}</p></div>
          <div className="twin-a2a-options"><label><input type="radio" name={row.id} checked={draft[row.id]} onChange={() => setDraft({ ...draft, [row.id]: true })} />{row.automatic}</label><label><input type="radio" name={row.id} checked={!draft[row.id]} onChange={() => setDraft({ ...draft, [row.id]: false })} />{row.manual}</label></div>
        </div>)}
        <section className="twin-a2a-boundaries"><h3><ShieldCheck size={17} />始终需要遵守的边界</h3><p>新增承诺、调整期限、任务归属冲突时，仍需本人确认。</p><p>上传输出物、填写和提交业务表单，由本人手动完成。</p><p>平台强制确认规则优先于个人协作偏好；个人协作偏好优先于本页四项设置。</p></section>
        <section className="twin-a2a-preview"><h3>当前选择下的行为预览</h3><p>收到资料齐全且属于本人职责的协作请求时，{draft.start ? "分身可先查询、分析并起草" : "分身会先请你确认再开工"}；需要缺失信息时，{draft.clarify ? "仅向本次参与人追问" : "先请你确认追问内容"}。</p><p>有已核实进展时，{draft.progress ? "可自动回复" : "发送前请你确认"}；成果完成后，{draft.deliver ? "仅在接收人有权查看时发送" : "发送前请你确认"}。</p></section>
      </div>
    </Dialog>}
  </section>;
}
