import React from "react"
import { observer, Observer, useLocalObservable } from "../src"

@observer
class T1 extends React.Component<{ pizza: number }, {}> {
    render() {
        return <div>{this.props.pizza}</div>
    }
}

const T2 = observer(
    class T2 extends React.Component<{ cake: number; zoem: any[] }> {
        defaultProps = { cake: 7 }
        render() {
            return (
                <div>
                    <T1 pizza={this.props.cake} />
                </div>
            )
        }
    }
)

const T3 = observer((props: { hamburger: number }) => {
    return <T2 cake={props.hamburger} zoem={[]} />
})

const T4 = ({ sandwich }: { sandwich: number }) => (
    <div>
        <T3 hamburger={sandwich} />
    </div>
)

const T5 = observer(() => {
    return <T3 hamburger={17} />
})

@observer
class T6 extends React.Component<{}, {}> {
    render() {
        return (
            <span>
                <T3 hamburger={6} />
                {/* doesn't work with tsc 1.7.5: https://github.com/Microsoft/TypeScript/issues/5675 */}
                {/*<T4 sandwich={5} />*/}
                <T5 />
            </span>
        )
    }
}

const x = React.createElement(T3, { hamburger: 4 })

class T7 extends React.Component<{ pizza: number }, {}> {
    render() {
        return <div>{this.props.pizza}</div>
    }
}
React.createElement(observer(T7), { pizza: 4 })

class ObserverTest extends React.Component<any, any> {
    render() {
        return <Observer>{() => <div>test</div>}</Observer>
    }
}

class ObserverTest2 extends React.Component<any, any> {
    render() {
        return <Observer render={() => <div>test</div>} />
    }
}

@observer
class ComponentWithoutPropsAndState extends React.Component<{}, {}> {
    componentDidUpdate() {}

    render() {
        return <div>Hello!</div>
    }
}

const AppInner = observer((props: { a: number }) => {
    return (
        <div>
            <h1>Hello</h1>
            {props.a}
        </div>
    )
})

;<AppInner a={1} />

{
    const TestComponent = () => {
        const observable = useLocalObservable(() => ({
            test: 3
        }))

        return <h1>{observable.test * 2}</h1>
    }
    ;<TestComponent />
}

test("ok", () => {
    // just to satisfy jest
})
