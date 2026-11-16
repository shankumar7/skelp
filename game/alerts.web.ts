/** No phone notifications in the web preview. */
export async function enableAlerts(): Promise<boolean> { return false; }
export function alertPlayer(_title: string, _body: string) {}
export function clearAlerts() {}
