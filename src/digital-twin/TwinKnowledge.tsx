import { useRef, useState } from "react";
import { FileText, Folder, Plus, Upload } from "lucide-react";
import { actions } from "../role-center/store";
import { Dialog, Empty, Markdown } from "../role-center/ui";
import { readTwinLibraries, twinKnowledgeKey, type Item, type Library } from "./twinKnowledgeData";

export default function TwinKnowledge() {
  const [folders, setFolders] = useState(readTwinLibraries);
  const [selectedId, setSelectedId] = useState(folders[0]?.id || "");
  const [editing, setEditing] = useState<Item | null>(null);
  const [folderName, setFolderName] = useState("");
  const [newFolder, setNewFolder] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = folders.find((folder) => folder.id === selectedId);
  const save = (next: Library[]) => { localStorage.setItem(twinKnowledgeKey(), JSON.stringify(next)); setFolders(next); };
  const changeFolder = (folder: Library) => save(folders.map((item) => item.id === folder.id ? folder : item));
  const addItem = (item: Item) => { if (!selected || selected.kind !== "personal") return; changeFolder({ ...selected, items: [...selected.items, item] }); };
  return <div className="twin-knowledge">
    <header><div><h2>知识库</h2><p>选择当前分身的检索范围；个人资料按知识库归档。</p></div></header>
    <div className="twin-knowledge-layout">
      <aside>
        {(["enterprise", "personal"] as const).map((kind) => <section key={kind}><div className="twin-knowledge-group"><strong>{kind === "enterprise" ? "企业知识库" : "个人知识库"}</strong>{kind === "personal" && <button title="新建个人知识库" aria-label="新建个人知识库" onClick={() => { setFolderName(""); setNewFolder(true); }}><Plus size={15} /></button>}</div>
          {folders.filter((folder) => folder.kind === kind).map((folder) => <button className={`twin-knowledge-folder ${selectedId === folder.id ? "selected" : ""}`} key={folder.id} onClick={() => setSelectedId(folder.id)}><Folder size={16} /><span>{folder.name}</span><small>{folder.items.length}</small></button>)}
        </section>)}
      </aside>
      <main>
        {selected ? <>
          <div className="twin-knowledge-heading"><div><h3>{selected.name}</h3><p>{selected.kind === "enterprise" ? "企业提供的知识库" : "仅本人维护的知识库"} · {selected.items.length} 个文件</p></div><input className="twin-knowledge-switch" type="checkbox" role="switch" aria-label={`为当前分身${selected.enabled ? "停用" : "启用"}${selected.name}检索`} checked={selected.enabled} onChange={() => { changeFolder({ ...selected, enabled: !selected.enabled }); actions.twinKnowledgeSelection(selected.name, !selected.enabled); }} /></div>
          {selected.kind === "personal" && <div className="twin-knowledge-actions"><input hidden type="file" ref={fileInput} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { addItem({ id: crypto.randomUUID(), name: file.name, kind: "file", content: String(reader.result), at: new Date().toLocaleDateString("sv-SE") }); setError(""); } catch { setError("文件未能保存到本地演示数据，请使用平台知识库上传。"); } }; reader.onerror = () => setError("文件读取失败，请重试。"); reader.readAsDataURL(file); event.target.value = ""; }} /><button onClick={() => fileInput.current?.click()}><Upload size={15} />上传文件</button><button onClick={() => { setError(""); setEditing({ id: crypto.randomUUID(), name: "", kind: "note", content: "", at: "" }); }}><Plus size={15} />添加笔记</button></div>}
          {error && !editing && <p role="alert" className="twin-knowledge-error">{error}</p>}
          {selected.items.length ? <div className="twin-knowledge-files">{selected.items.map((item) => <button key={item.id} onClick={() => setEditing(item)}><FileText size={18} /><span><strong>{item.name}</strong><small>{item.kind === "note" ? "笔记" : "文件"} · {item.at}</small></span><span>查看</span></button>)}</div> : <Empty title="当前知识库还没有文件" />}
        </> : <Empty title="请选择知识库" />}
      </main>
    </div>
    {newFolder && <Dialog title="新建个人知识库" onClose={() => setNewFolder(false)} footer={<><button onClick={() => setNewFolder(false)}>取消</button><button className="rc-primary" onClick={() => { if (!folderName.trim()) { setError("请输入知识库名称"); return; } const folder = { id: crypto.randomUUID(), name: folderName.trim(), kind: "personal" as const, enabled: true, items: [] }; save([...folders, folder]); actions.twinKnowledgeSelection(folder.name, true); setSelectedId(folder.id); setNewFolder(false); setError(""); }}>创建</button></>}><label className="rc-field">知识库名称<input value={folderName} onChange={(event) => setFolderName(event.target.value)} /></label>{error && <p role="alert">{error}</p>}</Dialog>}
    {editing && <Dialog title={editing.kind === "note" ? (editing.at ? "笔记" : "添加笔记") : editing.name} onClose={() => setEditing(null)} wide footer={<><button onClick={() => setEditing(null)}>关闭</button>{selected?.kind === "personal" && editing.at && <button className="rc-danger" onClick={() => { if (!window.confirm(`确定删除“${editing.name}”？`)) return; changeFolder({ ...selected, items: selected.items.filter((item) => item.id !== editing.id) }); actions.profileGrowth(`删除个人知识：${editing.name}`); setEditing(null); }}>删除</button>}{editing.kind === "note" && selected?.kind === "personal" && <button className="rc-primary" onClick={() => { if (!editing.name.trim() || !editing.content?.trim()) { setError("请填写笔记标题和内容"); return; } const note = { ...editing, name: editing.name.trim().endsWith(".md") ? editing.name.trim() : `${editing.name.trim()}.md`, at: new Date().toLocaleDateString("sv-SE") }; changeFolder({ ...selected, items: selected.items.some((item) => item.id === note.id) ? selected.items.map((item) => item.id === note.id ? note : item) : [...selected.items, note] }); actions.profileGrowth(`更新知识笔记：${note.name}`); setEditing(null); setError(""); }}>保存笔记</button>}</>}>
      {editing.kind === "note" && selected?.kind === "personal" ? <div className="twin-knowledge-note"><label>笔记标题<input aria-label="笔记标题" value={editing.name.replace(/\.md$/, "")} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label>笔记内容<textarea aria-label="笔记内容" value={editing.content || ""} onChange={(event) => setEditing({ ...editing, content: event.target.value })} /></label>{error && <p role="alert">{error}</p>}</div> : editing.kind === "note" ? <Markdown content={editing.content || ""} /> : <div><p>此文件归档在“{selected?.name}”中。</p>{editing.content?.startsWith("data:") ? <a className="twin-knowledge-download" href={editing.content} download={editing.name}>下载文件</a> : <p>演示资料由知识库平台提供，原文件预览请在正式系统查看。</p>}</div>}
    </Dialog>}
  </div>;
}
