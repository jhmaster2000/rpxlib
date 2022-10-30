export class DataSink {
    #buffers: Uint8Array[] | null = [];

    write(data: Uint8Array): number {
        this.#buffers!.push(data);
        return data.byteLength;
    }

    flush(): Buffer {
        return Buffer.concat(this.#buffers!);
    }

    end(): Buffer {
        const buffer = this.flush();
        this.#buffers = null;
        return buffer;
    }
}
