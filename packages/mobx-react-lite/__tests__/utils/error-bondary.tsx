import React from "react"

export class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{ fallback: string }>,
    { hasError: boolean }
> {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }

        return this.props.children
    }
}
