import moment from 'moment';
import uuid from 'uuid';
import Route from 'react-router-dom/Route';
import React from 'react';
import PropTypes from 'prop-types';

import Paneset from '@folio/stripes-components/lib/Paneset';
import Pane from '@folio/stripes-components/lib/Pane';
import PaneMenu from '@folio/stripes-components/lib/PaneMenu';

import Button from '@folio/stripes-components/lib/Button';
import MultiColumnList from '@folio/stripes-components/lib/MultiColumnList';

import { onChangeFilter as commonChangeFilter } from '@folio/stripes-components/lib/FilterGroups';

import Reserves from './Reserves';
import Queuers from './Queuers';

/** stripes connect */
const INITIAL_RESULT_COUNT = 30;
const RESULT_COUNT_INCREMENT = 30;

class Waitlists extends React.Component {

  static contextTypes = {
    stripes: PropTypes.object,
  }

  static manifest = Object.freeze({
    waitlistCount: {
      initialValue: INITIAL_RESULT_COUNT
    },
    viewQueuersMode: {
      initialValue: {
        mode: false
      }
    },
    addWaitlistMode: {
      initialValue: {
        mode: false
      }
    },
    waitlists: {
      type: 'okapi',
      path: 'waitlists',
      records: 'waitlists',
      recordsRequired: '%{waitlistCount}',
      perRequest: RESULT_COUNT_INCREMENT,
    },
  });

  constructor(props, context) {
    super(props, context);

    // logger
    const logger = props.stripes.logger;
    this.log = logger.log.bind(logger);

    // reserves layer
    this.onOpenReserves = this.onOpenReserves.bind(this);
    this.onCloseReserves = this.onCloseReserves.bind(this);
    this.onSubmitNewWaitlist = this.onSubmitNewWaitlist.bind(this);
    this.connectedReservesLayer = props.stripes.connect(Reserves);

    // queuers pane
    this.onOpenQueuers = this.onOpenQueuers.bind(this);
    this.onCloseQueuers = this.onCloseQueuers.bind(this);
    this.connectedQueuersPane = props.stripes.connect(Queuers);

    // multi-column-list
    this.resultsList = null;
    this.onSelectRow = this.onSelectRow.bind(this);
    this.anchoredRowFormatter = this.anchoredRowFormatter.bind(this);

    // react state
    this.state = {
      searchTerm: '',
      sortOrder: '',
      selectedRow: {},
    };
  }

  /** reserves */
  createWaitlist(reserve) {
    return {
      id: uuid(),
      title: reserve.title,
      reserveId: reserve.id,
      timerState: "stopped"
    };
  };

  onOpenReserves() {
    // this.log('action', 'onOpenReserves');
    this.props.history.push(`/waitlists/reserves`);
  };

  onCloseReserves(e) {
    // this.log('action', 'onCloseReserves');
    if (e) e.preventDefault();
    this.props.history.push(`${this.props.match.path}`);
  };

  onSubmitNewWaitlist(selectedReserve) {
    const waitlist = this.createWaitlist(selectedReserve);
    // this.log('action', `onSubmitNewWaitlist: ${JSON.stringify(waitlist)}`);
    this.props.mutator.waitlists.POST(waitlist);
    this.onCloseReserves();
  };

  /** queuers */
  onOpenQueuers(waitlist) {
    // this.log('action', `onOpenQueuers: ${JSON.stringify(waitlist)}`);
    const waitlistId = waitlist.id;
    this.setState({ selectedRow: waitlist });
    this.props.history.push(`/waitlists/${waitlist.id}/queuers`);
  }

  onCloseQueuers(e) {
    // this.log('action', 'onCloseQueuers');
    if (e) e.preventDefault();
    this.setState({ selectedRow: {} });
    this.props.history.push(`${this.props.match.path}`);
  }

  /** filters */
  onChangeFilter(e) {
    // this.log('action', 'onChangeFilter');
    this.props.mutator.waitlistCount.replace(INITIAL_RESULT_COUNT);
    this.commonChangeFilter(e);
  };

  /** mutli-column-list */
  onSelectRow(e, waitlist) {
    // this.log('action', `onSelectRow`);
    this.onOpenQueuers(waitlist);
  };

  onSort(e, meta) {
    // this.log('action', `onSort: ${JSON.stringify(meta)}`);
  };

  onNeedMore = () => {
    // this.log('action', 'onNeedMore');
    this.props.mutator.waitlistCount.replace(this.props.resources.waitlistCount + RESULT_COUNT_INCREMENT);
  };

  anchoredRowFormatter(
    { rowIndex,
      rowClass,
      rowData,
      cells,
      rowProps,
      labelStrings,
    },
  ) {
    return (
      <a
        href={`/waitlists/${rowData.id}/queuers`} 
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
    // this.log('action', `render Waitlist`);

    const { resources, stripes } = this.props;
    const waitlists = (resources.waitlists || {}).records || [];

    const newWaitlistButton = (
      <PaneMenu>
        <Button
          id="clickable-new-waitlist"
          title="Create"
          onClick={this.onOpenReserves}
          buttonStyle="primary paneHeaderNewButton">Create</Button>
      </PaneMenu>
    );
    const resultsFormatter = {
      'Date Created': x => moment(x['createDate']).format('MMMM Do YYYY, h:mm a')
    };
    const maybeTerm = false ? ` for "${this.state.searchTerm}"` : '';
    const maybeSpelling = false ? 'spelling and ' : '';
    return (
      <Paneset isRoot>
        {/** waitlists */}
        <Pane
          id="results-pane"
          defaultWidth="fill"
          paneTitle="Waitlists"
          lastMenu={newWaitlistButton}>
          <MultiColumnList
            contentData={waitlists}
            selectedRow={this.state.selectedRow}
            rowMetadata={['title', 'createDate']}
            formatter={resultsFormatter}
            onRowClick={this.onSelectRow}
            onHeaderClick={this.onSort}
            onNeedMoreData={this.onNeedMore}
            visibleColumns={['title', 'Date Created']}
            sortOrder={this.state.sortOrder.replace(/^-/, '').replace(/,.*/, '')}
            sortDirection={this.state.sortOrder.startsWith('-') ? 'descending' : 'ascending'}
            isEmptyMessage={`No results found${maybeTerm}. Please check your ${maybeSpelling}filters.`}
            loading={this.props.waitlists ? this.props.waitlists.isPending : false}
            autosize
            virtualize
            ariaLabel={'Waitlist results'}
            rowFormatter={this.anchoredRowFormatter}
            containerRef={(ref) => { this.resultsList = ref; }} />
        </Pane>

        {/** queures */}
        <Route
          path={`${this.props.match.path}/:waitlistid/queuers`}
          render={props =>
            <this.connectedQueuersPane
              viewedWaitlist={this.state.selectedRow}
              onCloseQueuers={this.onCloseQueuers}
              paneWidth="50%"
              stripes={stripes}
              {...props} />
          } />

        {/** reserves */}
        <Route
          path={`${this.props.match.path}/reserves`}
          render={props =>
            <this.connectedReservesLayer
              onSubmit={this.onSubmitNewWaitlist}
              onClose={this.onCloseReserves}
              {...this.props} />
          } />
      </Paneset>
    );
  }
}

export default Waitlists;
