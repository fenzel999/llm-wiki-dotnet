import os, re, json

WIKI = r"D:\fenzel\llm-wiki-dotnet\wiki"
nodes, links = [], []
seen = set()

link_re = re.compile(r"\[[^\]]+\]\(([^)]+)\)")

def resolve(src_dir, target):
    if target.startswith(("http://", "https://", "mailto:")):
        return None
    target = target.split("#")[0].split("?")[0]
    if not target:
        return None
    if target.endswith("/"):
        target += "index.md"
    path = os.path.normpath(os.path.join(src_dir, target))
    if not path.startswith(WIKI):
        return None
    if not path.endswith(".md"):
        return None
    if not os.path.exists(path):
        return None
    rel = os.path.relpath(path, WIKI).replace(os.sep, "/")
    return rel

for root, _, files in os.walk(WIKI):
    for f in files:
        if not f.endswith(".md"):
            continue
        full = os.path.join(root, f)
        rel = os.path.relpath(full, WIKI).replace(os.sep, "/")
        if rel in seen:
            continue
        seen.add(rel)
        # title from frontmatter or filename
        title = rel
        try:
            txt = open(full, encoding="utf-8").read()
        except Exception:
            txt = ""
        m = re.search(r"^title:\s*(.+)$", txt, re.MULTILINE)
        if m:
            title = m.group(1).strip()
        group = rel.split("/")[0] if "/" in rel else "root"
        if group in ("QA.md", "POLICY.md", "QA-REPORT.md", "log.md", "index.md",
                     "overview.md", "思维导图.md", "知识图谱3D.md", "如何反馈.md"):
            group = "governance"
        if group == "sources":
            group = "sources"
        link = "../" + rel[:-3] + "/" if rel != "index.md" else "../"
        nodes.append({"id": rel, "label": title, "group": group, "link": link})
        src_dir = root
        for tgt in link_re.findall(txt):
            r = resolve(src_dir, tgt)
            if r and r != rel:
                links.append({"source": rel, "target": r})

# dedupe links
uniq = []
s = set()
for l in links:
    k = (l["source"], l["target"])
    if k not in s:
        s.add(k)
        uniq.append(l)

out = {"nodes": nodes, "links": uniq}
with open(os.path.join(WIKI, "graph.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
print("nodes:", len(nodes), "links:", len(uniq))
