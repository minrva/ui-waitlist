import _ from 'lodash';
import moment from 'moment';
import uuid from 'uuid';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { Field, reduxForm } from 'redux-form';
import Link from 'react-router-dom/Link';
import Route from 'react-router-dom/Route';

import Layer from '@folio/stripes-components/lib/Layer';
import Paneset from '@folio/stripes-components/lib/Paneset';
import Pane from '@folio/stripes-components/lib/Pane';
import PaneMenu from '@folio/stripes-components/lib/PaneMenu';
import { Row, Col } from '@folio/stripes-components/lib/LayoutGrid';
import Select from '@folio/stripes-components/lib/Select';

import Button from '@folio/stripes-components/lib/Button';
import TextField from '@folio/stripes-components/lib/TextField';
import MultiColumnList from '@folio/stripes-components/lib/MultiColumnList';

import { onChangeFilter as commonChangeFilter } from '@folio/stripes-components/lib/FilterGroups';

import Timer from './Timer';
import QueuerForm from './QueuerForm';

// configuration
const TICK_INTERVAL = 5000;
const STOPPED = "stopped";
const STARTED = "started";
const PAUSED = "paused";

class Queuers extends React.Component {

    static manifest = Object.freeze({
        addQueuerMode: {
            initialValue: {
                mode: false
            }
        },
        selectedWaitlist: {
            type: 'okapi',
            path: 'waitlists/:{waitlistid}',
        },
        queuers: {
            type: 'okapi',
            path: 'queuers',
            records: 'queuers',
            GET: {
                params: {
                    query: 'waitlistId=:{waitlistid}',
                },
            },
        },
        pollWaitlist: {
            type: 'okapi',
            accumulate: true,
            path: 'waitlists/:{waitlistid}',
        },
        pollQueuers: {
            type: 'okapi',
            accumulate: true,
            path: 'queuers',
            records: 'queuers',
            GET: {
                params: {
                    query: 'waitlistId=:{waitlistid}',
                },
            },
        },
    });

    constructor(props, context) {
        super(props);

        // logger
        const logger = props.stripes.logger;
        this.log = logger.log.bind(logger);

        // waitlist timer
        this.onStopTimer = this.onStopTimer.bind(this);
        this.onPauseTimer = this.onPauseTimer.bind(this);
        this.onStartTimer = this.onStartTimer.bind(this);

        // queuer layer
        this.toggleNewQueuerLayer = this.toggleNewQueuerLayer.bind(this);
        this.onClickSubmitNewQueuer = this.onClickSubmitNewQueuer.bind(this);

        // multi-column-list
        this.resultsList = null;
        this.onSelectRow = this.onSelectRow.bind(this);
        this.anchoredRowFormatter = this.anchoredRowFormatter.bind(this);

        // react state
        const query = props.location.search ? queryString.parse(props.location.search) : {};
        this.state = {
            selectedQueuer: {},
            searchTerm: query.query || '',
            sortOrder: query.sort || '',
            waitlist: {},
            queuers: [],
        };
    };

    /** react life-cycle */
    componentDidMount() {
        this.timerId = setInterval(() => this.tick(), TICK_INTERVAL);
    }

    componentWillReceiveProps(nextProps) {
        const next = nextProps.resources.queuers;
        const current = this.props.resources.queuers;
        const currentLoaded = current && current.hasLoaded;
        const firstLoad = !currentLoaded && next.hasLoaded && next.records && next.records.length;
        const diffEndpoint = current && next && next.url != current.url;
        if (firstLoad || diffEndpoint) {
            const waitlistid = nextProps.match.params.waitlistid;
            const selectedWaitlist = (nextProps.resources.selectedWaitlist || {}).records || [];
            const waitlist = selectedWaitlist.find(i => i.id === waitlistid) || {};
            const queuers = (nextProps.resources.queuers || {}).records || [];
            this.setState({
                waitlist: waitlist,
                queuers: queuers,
            });
        }
    };

    componentWillUnmount() {
        clearInterval(this.timerId);
    }

    /** short polling */
    tick() {
        const { match: { params: { waitlistid } } } = this.props;
        this.props.mutator.pollWaitlist.reset()
        this.props.mutator.pollWaitlist.GET()
            .then(waitlist => {
                this.setState({ waitlist: waitlist });
            });
        this.props.mutator.pollQueuers.reset()
        this.props.mutator.pollQueuers.GET({ params: { query: `waitlistId=${waitlistid}` } })
            .then(queuers => {
                this.setState({ queuers: queuers });
            });
    }

    /** waitlist timer */
    onStartTimer(e) {
        // this.log('action', 'onStartTimer');
        if (e) e.preventDefault();
        this.updateTimer(STARTED);
    }

    onPauseTimer(e) {
        // this.log('action', 'onPauseTimer');
        if (e) e.preventDefault();
        this.updateTimer(PAUSED);
    }

    onStopTimer(e) {
        // this.log('action', 'onStopTimer');
        if (e) e.preventDefault();
        this.updateTimer(STOPPED);
    }

    updateTimer(timerState) {
        const waitlist = Object.assign({}, this.state.waitlist);
        waitlist['timerState'] = timerState;
        this.props.mutator.selectedWaitlist.PUT(waitlist);
    }

    /** queuer */
    createQueuer(queuerForm, waitlistId) {
        return {
            id: uuid(),
            username: queuerForm.username,
            email: queuerForm.email,
            waitlistId: waitlistId
        };
    }

    onClickSubmitNewQueuer(queuerForm) {
        const isValid = queuerForm && queuerForm.username && queuerForm.email;
        if (isValid) {
            const { match: { params: { waitlistid } } } = this.props;
            const queuer = this.createQueuer(queuerForm, waitlistid);
            this.props.mutator.queuers.POST(queuer);
        }
        this.toggleNewQueuerLayer();
    }

    toggleNewQueuerLayer(e) {
        if (e) e.preventDefault();
        const { resources } = this.props;
        const isOpen = resources.addQueuerMode ? !resources.addQueuerMode.mode : true;
        this.props.mutator.addQueuerMode.replace({ mode: isOpen });
    }

    /** filters */
    onChangeFilter(e) {
        // this.log('action', 'onChangeFilter');
        this.commonChangeFilter(e);
    }

    /** mutli-column-list */
    onSelectRow(e, queuer) {
        // this.log('action', `onSelectRow`);
    };

    onSort(e, meta) {
        // this.log('action', `onSort`);
    };

    onNeedMore = () => {
        // this.log('action', 'onNeedMore');
    }

    anchoredRowFormatter(
        {
            rowIndex,
            rowClass,
            rowData,
            cells,
            rowProps,
            labelStrings,
        },
    ) {
        const { match: { params: { waitlistid } } } = this.props;
        return (
            <a
                href={`/waitlists/${waitlistid}/queuers/${rowData.id}`}
                key={`row-${rowIndex}`}
                aria-label={labelStrings && labelStrings.join('...')}
                role="listitem"
                className={rowClass}
                {...rowProps}
            >
                {cells}
            </a>
        );
    };

    render() {
        // this.log('action', `render Queuers`);

        const {
            resources,
            onCloseQueuers,
        } = this.props;

        // waitlist timer
        const waitlist = this.state.waitlist;
        const remainingTime = _.get(waitlist, 'remainingTime', -1);
        const timerState = _.get(waitlist, 'timerState', STOPPED);
        const isStarted = timerState === STARTED;
        const isStopped = timerState === STOPPED;
        const isPaused = timerState === PAUSED;

        // queuers
        const isQueuer = this.state.queuers.length === 0;

        // queuer pane menu
        const firstMenu = (
            <PaneMenu>
                <button onClick={onCloseQueuers} title="close" aria-label="Close New Waitlist Dialog">
                    <span style={{ fontSize: '30px', color: '#999', lineHeight: '18px' }} >&times;</span>
                </button>
            </PaneMenu>
        );
        const startBtn = (<Button id="clickable-start-queuer"
            onClick={this.onStartTimer}
            disabled={!isStarted && isQueuer}
            title={isPaused ? "Resume" : "Start"}
            buttonStyle="primary paneHeaderNewButton">{isPaused ? "Resume" : "Start"}</Button>)
        const pauseBtn = (<Button id="clickable-pause-queuer"
            onClick={this.onPauseTimer}
            disabled={!isStarted}
            title="Pause"
            buttonStyle="primary paneHeaderNewButton">Pause</Button>)
        const stopBtn = (<Button id="clickable-stop-timer"
            onClick={this.onStopTimer}
            disabled={isStopped}
            title="Stop"
            buttonStyle="primary paneHeaderNewButton">Stop</Button>)
        const createBtn = (<Button id="clickable-new-queuer"
            onClick={this.toggleNewQueuerLayer}
            title="Create"
            buttonStyle="primary paneHeaderNewButton">Create</Button>)
        const lastMenu = (
            <PaneMenu>
                {isStarted ? pauseBtn : startBtn}
                {stopBtn}
                {createBtn}
            </PaneMenu>
        );

        // multi-column-list
        const resultsFormatter = {
            'Date Created': x => moment(x['createDate']).format('MMMM Do YYYY, h:mm a')
        };
        const maybeTerm = false ? ` for "${this.state.searchTerm}"` : '';
        const maybeSpelling = false ? 'spelling and ' : '';

        return (
            <Paneset>
                {/** queuers */}
                <Pane
                    id="main-pane"
                    paneTitle={
                        <div style={{ textAlign: 'center' }}>
                            <strong>Queuers</strong>
                            <div>
                                {!isStopped ? (
                                    <Timer
                                        startDate={moment()}
                                        totalTime={remainingTime}
                                        timerState={timerState} />
                                ) : null}
                            </div>
                        </div>
                    }
                    defaultWidth="fill"
                    firstMenu={firstMenu}
                    lastMenu={lastMenu}>
                    <MultiColumnList
                        contentData={this.state.queuers}
                        selectedRow={this.state.selectedQueuer}
                        rowMetadata={['username']}
                        formatter={resultsFormatter}
                        onRowClick={this.onSelectRow}
                        onHeaderClick={this.onSort}
                        onNeedMoreData={this.onNeedMore}
                        visibleColumns={['username', 'email', 'Date Created']}
                        sortOrder={this.state.sortOrder.replace(/^-/, '').replace(/,.*/, '')}
                        sortDirection={this.state.sortOrder.startsWith('-') ? 'descending' : 'ascending'}
                        isEmptyMessage={`No results found${maybeTerm}. Please check your ${maybeSpelling}filters.`}
                        loading={this.props.queuers ? this.props.queuers.isPending : false}
                        autosize
                        virtualize
                        ariaLabel={'Queuer results'}
                        rowFormatter={this.anchoredRowFormatter}
                        containerRef={(ref) => { this.resultsList = ref; }} />
                </Pane>

                {/** queuer form */}
                <Layer isOpen={resources.addQueuerMode ? resources.addQueuerMode.mode : false} label="Add New Queuer Dialog">
                    <QueuerForm
                        onSubmit={this.onClickSubmitNewQueuer}
                        onCancelNewQueuer={this.toggleNewQueuerLayer}
                        {...this.props} />
                </Layer>
            </Paneset>
        );
    }
}

export default Queuers;
