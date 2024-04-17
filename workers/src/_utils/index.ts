import type {Header} from "postal-mime";

/**
 * @see https://github.com/edevil/email_worker_parser/blob/main/src/index.js
 * @param stream
 * @param streamSize
 */
export async function streamToArrayBuffer(stream, streamSize) {
  let result = new Uint8Array(streamSize);
  let bytesRead = 0;
  const reader = stream.getReader();
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    result.set(value, bytesRead);
    bytesRead += value.length;
  }
  return result;
}

export function extractEmail(headers: Header[] = []) {
  if (!headers?.length) return undefined;
  let header = headers.find(h => h.key === 'received');
  if (!header?.value) return undefined;
  let text = header.value;
  const emailRegex = /<([^<>]+@[^<>]+)>/g;
  let matches;
  if ((matches = emailRegex.exec(text)) !== null) {
    return matches?.[1];
  }
  return undefined;
}
