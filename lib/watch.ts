/// <reference path="./observablevalue" />

namespace mobservable {
    export namespace _ {
        /**
         * given an expression, evaluate it once and track its dependencies.
         * Whenever the expression *should* re-evaluate, the onInvalidate event should fire
         */
        export class WatchedExpression<T> {
            private dependencyState = new DNode(this);
            private didEvaluate = false;
            public value:T;
    
            constructor(private expr:()=>T, private onInvalidate:()=>void){
                this.dependencyState.computeNextState();
            }
    
            compute() {
                if (!this.didEvaluate) {
                    this.didEvaluate = true;
                    this.value = this.expr();
                } else {
                    this.dispose();
                    this.onInvalidate();
                }
                return false;
            }
    
            dispose() {
                this.dependencyState.dispose();
            }
        }
    }
}