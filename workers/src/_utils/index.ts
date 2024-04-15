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
