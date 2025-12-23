declare module 'nbt' {
  interface NBTData {
    [key: string]: any
  }

  export function parse(data: Uint8Array | ArrayBuffer | Buffer): Promise<NBTData>
  export function write(data: NBTData): Buffer
  // Các hàm khác nếu cần, nhưng parse là chính
}