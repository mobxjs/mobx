import {
    observable, asStructure, autorun, extendObservable, 
    default as mobservable
} from "mobservable";

class Box {
    @observable uninitialized;
    @observable height = 20;
    @observable sizes = [2];
    @observable someFunc = function () { return 2; }
    @observable get width() {
        return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1);
    }
}

export function test_babel(test) {
    var box = new Box();
    
    var ar = []
    
    autorun(() => {
        ar.push(box.width);
    });

    test.deepEqual(ar.slice(), [40]);
    box.height = 10;
    test.deepEqual(ar.slice(), [40, 20]);
    box.sizes.push(3, 4);
    test.deepEqual(ar.slice(), [40, 20, 60]);
    box.someFunc = () => 7;
    test.deepEqual(ar.slice(), [40, 20, 60, 210]);
    box.uninitialized = true;
    test.deepEqual(ar.slice(), [40, 20, 60, 210, 420]);

    test.done();
};

