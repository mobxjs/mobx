/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import { DataNode } from './dnode';
import { ValueMode } from './core';
import { IContextInfoStruct } from './interfaces';
export declare class ObservableObject {
    private target;
    private context;
    private mode;
    values: {
        [key: string]: DataNode;
    };
    constructor(target: any, context: IContextInfoStruct, mode: ValueMode);
    static asReactive(target: any, context: IContextInfoStruct, mode: ValueMode): ObservableObject;
    set(propName: any, value: any): void;
    private defineReactiveProperty(propName, value);
}
