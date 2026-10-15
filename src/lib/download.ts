/** Descarga un texto como archivo (copia de seguridad, CSV, .ics). Devuelve false si el entorno no lo permite. */
export function downloadText(filename: string, text: string, mime = 'text/plain'): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
