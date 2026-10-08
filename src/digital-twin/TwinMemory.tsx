import { useState } from "react";
import { Pencil } from "lucide-react";
import { isNewDemoUser, personalStorageKey } from "../role-center/demoAccount";
import { actions } from "../role-center/store";
import { Dialog, Markdown } from "../role-center/ui";

const key = () => personalStorageKey("digital-twin-work-memory-v1");
const updatedKey = () => personalStorageKey("digital-twin-work-memory-updated-at-v1");
const example = `# 工作记忆

## 在办事项
正在推进重点项目周报，当前需要补齐验收口径和计划基线。

## 协作往来
正在与王工协同核对联调问题的影响节点，等待补充责任人和关闭时间。

## 长期经验
做经营差异分析时，先区分付款时点变化、范围调整和实际节约；依据不足时不下结论。`;
const empty = "# 工作记忆\n\n## 在办事项\n\n## 协作往来\n\n## 长期经验";
const withoutTimestamp = (content: string) => content.replace(/^最近更新[:：].*\n?/m, "");

export default function TwinMemory({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(() => withoutTimestamp(localStorage.getItem(key()) || (isNewDemoUser() ? empty : example)));
  const [draft, setDraft] = useState(saved);
  const [updatedAt, setUpdatedAt] = useState(() => localStorage.getItem(updatedKey()) || (isNewDemoUser() ? "尚未更新" : "2026-09-29 10:20"));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const close = () => {
    if (editing && draft !== saved && !window.confirm("放弃未保存的工作记忆修改？")) return;
    onClose();
  };
  return (
    <Dialog title="工作记忆" onClose={close} wide footer={<>
      <button onClick={close}>关闭</button>
      {editing ? <>
        <button onClick={() => { setDraft(saved); setEditing(false); setError(""); }}>取消编辑</button>
        <button className="rc-primary" onClick={() => {
          const content = withoutTimestamp(draft);
          if (content.length > 1500) { setError("内容已超出工作记忆的容量，请精简后保存。"); return; }
          if (content !== saved) {
            const time = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 16);
            localStorage.setItem(key(), content);
            localStorage.setItem(updatedKey(), time);
            actions.profileGrowth("更新工作记忆");
            setSaved(content);
            setDraft(content);
            setUpdatedAt(time);
          }
          setError("");
          setEditing(false);
        }}>保存</button>
      </> : <button className="rc-primary" onClick={() => setEditing(true)}><Pencil size={14} />编辑</button>}
    </>}>
      <div className="twin-memory">
        <p>助理会随工作进展整理当前上下文，你也可以直接修改。</p>
        <p className="twin-memory-updated">最近更新：{updatedAt}</p>
        {editing ? <textarea aria-label="编辑工作记忆" value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} /> : <Markdown content={saved} />}
        {error && <p role="alert" className="twin-memory-error">{error}</p>}
      </div>
    </Dialog>
  );
}
