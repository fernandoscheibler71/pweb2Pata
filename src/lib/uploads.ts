export async function uploadImage(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
  const session = JSON.parse(localStorage.getItem("pata-amiga-session") || "null");
  if (!session?.access_token) throw new Error("Faça login para enviar uma imagem.");
  const body = new FormData(); body.append("file", file); body.append("folder", folder);
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
  const response = await fetch(`${baseUrl}/uploads`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Não foi possível enviar a imagem.");
  return result.url as string;
}
