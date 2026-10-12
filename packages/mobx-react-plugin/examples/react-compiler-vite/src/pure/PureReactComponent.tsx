// Excluded from mobx-react-plugin: compiled by React Compiler like any other component.
export function PureReactComponent({ clicks }: { clicks: number }) {
    const label = clicks === 1 ? "click" : "clicks"
    return (
        <dl>
            <dt>button {label}</dt>
            <dd data-testid="pure-clicks">{clicks}</dd>
        </dl>
    )
}
