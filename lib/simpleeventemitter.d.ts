/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import { Lambda } from './interfaces';
export default class SimpleEventEmitter {
    listeners: {
        (data?): void;
    }[];
    emit(...data: any[]): any;
    on(listener: (...data: any[]) => void): Lambda;
    once(listener: (...data: any[]) => void): Lambda;
}
