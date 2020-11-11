import React from "react"

interface ErrorCatcherState {
    hasError: boolean
}

// FIXME: saddly, this does not work as hoped, see: https://github.com/facebook/react/issues/10474#issuecomment-332810203
export default class ErrorCatcher extends React.Component<any, Readonly<ErrorCatcherState>> {
    static lastError
    static getError
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    componentDidCatch(error, info) {
        console.error("Caught react error", error, info)
        ErrorCatcher.lastError = "" + error
        this.setState({ hasError: true })
    }

    render() {
        if (this.state.hasError) {
            return null
        }
        return this.props.children
    }
}

ErrorCatcher.lastError = ""
ErrorCatcher.getError = function () {
    const res = ErrorCatcher.lastError
    ErrorCatcher.lastError = ""
    return res
}
