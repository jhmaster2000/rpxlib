import type { RPL } from './rpl.js';
import type { ProgramFlags, ProgramType } from './enums.js';
import { DataWrapper } from './datawrapper.js';
import { uint32 } from './primitives.js';
import { Structs } from './structs.js';

// TODO: Program headers modification
export class Program extends Structs.Program {
    constructor(inputdata: DataWrapper | Structs.ProgramValues & { offset: uint32, fileSize: uint32 /*data?: Uint8Array | null*/ }, rpx: RPL) {
        super();
        this.rpx = rpx;
        if (!(inputdata instanceof DataWrapper)) {
            this.type = new uint32(inputdata.type) as ProgramType;
            this.storedOffset = new uint32(inputdata.offset);
            this.virtualAddr = new uint32(inputdata.virtualAddr);
            this.physicalAddr = new uint32(inputdata.physicalAddr);
            this.programFileSize = new uint32(inputdata.fileSize);
            this.programMemorySize = new uint32(inputdata.programMemorySize);
            this.flags = new uint32(inputdata.flags) as ProgramFlags;
            this.align = new uint32(inputdata.align);
            //this.#data = inputdata.data ?? null;
            //if (this.hasData) {
            //    this.storedOffset = new uint32(0xFFFFFFFF); // Special value to indicate that the offset is not yet known but is non-zero.
            //    this.programFileSize = this.size;
            //}
            Object.freeze(this);
            return this;
        }
        const file = inputdata;
        this.type = file.passUint32() as ProgramType;
        this.storedOffset = file.passUint32();
        this.virtualAddr = file.passUint32();
        this.physicalAddr = file.passUint32();
        this.programFileSize = file.passUint32();
        this.programMemorySize = file.passUint32();
        this.flags = file.passUint32() as ProgramFlags;
        this.align = file.passUint32();
        Object.freeze(this);
    }

    override readonly type: ProgramType;
    // TODO: It's possible to map sections to programs, with Section.addr being inside Program.virtualAddr -> Program.virtualAddr + Program.programMemorySize.
    public override readonly storedOffset;
    public override readonly programFileSize;

    get index(): number {
        return this.rpx.programs.indexOf(this);
    }

    /** @internal The RPL/RPX file this Program belongs to. */
    protected readonly rpx: RPL;
    
    // TODO
    //? Not sure if segment data should be allowed to go between null and non-null, but PT_LOAD segments can happen as both.
    //#data: Uint8Array | null = null;
}
