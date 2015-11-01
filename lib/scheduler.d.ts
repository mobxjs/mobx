/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import { Lambda } from './interfaces';
export declare function schedule(func: Lambda): void;
export declare function transaction<T>(action: () => T): T;
