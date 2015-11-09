import {
    observable, asStructure, autorun, extendObservable, 
    default as mobservable
} from "../";

class Box {
    @observable uninitialized;
    @observable height = 20;
    @observable sizes = [2];
    @observable someFunc = function () { return 2; }
    @observable get width() {
        return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1);
    }
}

var box = new Box();

var ar = []

autorun(() => {
    ar.push(box.width);
});

console.log(ar.slice(), [40]);
box.height = 10;
console.log(ar.slice(), [40, 20]);
box.sizes.push(3, 4);
console.log(ar.slice(), [40, 20, 60]);
box.someFunc = () => 7;
console.log(ar.slice(), [40, 20, 60, 210]);
box.uninitialized = true;
console.log(ar.slice(), [40, 20, 60, 210, 420]);
