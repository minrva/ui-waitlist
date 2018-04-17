import React from 'react';
import moment from 'moment';

const TICK_INTERVAL = 1000;
const PAUSED = "paused";

class Timer extends React.Component {

    constructor(props) {
        super(props);
        this.state = { 
            startDate: props.startDate,
            timerState: props.timerState
        };
    }

    /** react life-cycle */
    componentDidMount() {
        this.timerId = setInterval(() => this.tick(), TICK_INTERVAL);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({ 
            startDate: nextProps.startDate,
            timerState: nextProps.timerState 
        });
    }

    componentWillUnmount() {
        clearInterval(this.timerId);
    }

    /** tick-tock */
    tick() {
        const timerState = this.state.timerState;
        if(timerState && timerState !== PAUSED) {
            this.setState({ now: moment() });
        }
    }

    formatTime(millis) {
        const mins = ~~(millis / 1000 / 60);
        const secs = ~~(millis / 1000) - mins * 60;
        return `${(mins < 10 ? '0' : '') + mins}m ${(secs < 10 ? '0' : '') + secs}s`;
    }

    getDispTime() {
        const now = moment();
        const start = this.state.startDate;
        const totalTime = this.props.totalTime;
        let remaining = totalTime - now.diff(start);
        remaining = remaining < 0 ? 0 : remaining;
        remaining = remaining > totalTime ? totalTime : remaining;
        return <div>{this.formatTime(remaining)}</div>;
    }

    render() {
        return <div>{this.getDispTime()}</div>;
    }
}

export default Timer;
