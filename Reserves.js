import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';

import Layer from '@folio/stripes-components/lib/Layer';
import Paneset from '@folio/stripes-components/lib/Paneset';
import Pane from '@folio/stripes-components/lib/Pane';
import PaneMenu from '@folio/stripes-components/lib/PaneMenu';
import { Row, Col } from '@folio/stripes-components/lib/LayoutGrid';
import Select from '@folio/stripes-components/lib/Select';

import FilterPaneSearch from '@folio/stripes-components/lib/FilterPaneSearch';
import Button from '@folio/stripes-components/lib/Button';
import MultiColumnList from '@folio/stripes-components/lib/MultiColumnList';

import makeQueryFunction from '@folio/stripes-components/util/makeQueryFunction';
import transitionToParams from '@folio/stripes-components/util/transitionToParams';

import packageInfo from './package';

/** stripes connect */
const INITIAL_RESULT_COUNT = 30;
const RESULT_COUNT_INCREMENT = 30;
const BIG_REQUEST_COUNT = 1000;
const reservesQueryFunc = makeQueryFunction(
  'cql.allRecords=1',
  'title="$QUERY*" or instructor="$QUERY*" or course="$QUERY*"',
  {},
  [{
    label: 'Instructor',
    name: 'instructor',
    cql: 'instructorId',
    values: []
  }, {
    label: 'Course',
    name: 'course',
    cql: 'courseId',
    values: []
  }],
);

class Reserves extends React.Component {

  static manifest = Object.freeze({
    itemCount: {
      initialValue: INITIAL_RESULT_COUNT
    },
    items: {
      type: 'okapi',
      path: 'reserves',
      records: 'items',
      recordsRequired: '%{itemCount}',
      perRequest: RESULT_COUNT_INCREMENT,
      GET: {
        params: {
          query: reservesQueryFunc,
        },
        staticFallback: { params: {} },
      },
    },
    courses: {
      type: 'okapi',
      path: 'courses',
      records: 'courses',
      perRequest: BIG_REQUEST_COUNT,
      recordsRequired: BIG_REQUEST_COUNT
    },
    instructors: {
      type: 'okapi',
      path: 'instructors',
      records: 'instructors',
      perRequest: BIG_REQUEST_COUNT,
      recordsRequired: BIG_REQUEST_COUNT
    },
  });

  constructor(props) {
    super(props);

    // logger
    const logger = props.stripes.logger;
    this.log = logger.log.bind(logger);

    // query
    const query = props.location.search ? queryString.parse(props.location.search) : {};
    this.transitionToParams = transitionToParams.bind(this);

    // search
    this.onChangeSearch = this.onChangeSearch.bind(this);
    this.onClearSearch = this.onClearSearch.bind(this);

    // filter
    this.onChangeFilter = this.onChangeFilter.bind(this);
    this.updateFilters = this.updateFilters.bind(this);

    // multi-column-list
    this.resultsList = null;
    this.onSelectRow = this.onSelectRow.bind(this);
    this.onSort = this.onSort.bind(this);

    // react state
    const filters = (query.filters || '').split(',').reduce(function (acc, filter) {
      const tokens = filter.split(".");
      if (tokens.length === 2) acc[tokens[0]] = tokens[1];
      return acc;
    }, {});
    this.state = {
      filters: filters,
      searchTerm: query.query || '',
      sortOrder: query.sort || '',
      selectedCourseId: filters['course'] || '',
      selectedInstructorId: filters['instructor'] || '',
      selectedReserve: {},
    };
  };

  /** react life-cycle */
  componentWillReceiveProps(nextProps) {
    const resource = this.props.resources.items;
    if (resource) {
      const sm = nextProps.resources.items.successfulMutations;
      if (sm.length > resource.successfulMutations.length) {
        this.onSelectRow(undefined, { id: sm[0].record.id });
      }
    }
  };

  /** filters */
  onChangeFilter(e) {
    this.log('action', 'onChangeFilter');
    if (e.target.name === 'course') {
      this.setState({ selectedCourseId: e.target.value });
    } else if (e.target.name === 'instructor') {
      this.setState({ selectedInstructorId: e.target.value });
    }
    const filters = Object.assign({}, this.state.filters);
    filters[e.target.name] = e.target.value;
    this.setState({ filters });
    this.updateFilters(filters);
  };

  updateFilters(filters) {
    this.transitionToParams({
      filters: Object.keys(filters)
        .filter(key => filters[key].length)
        .map(key => `${key}.${filters[key]}`)
        .join(',')
    });
  };

  /** search */
  performSearch = _.debounce((query) => {
    this.log('action', `searched for '${query}'`);
    this.transitionToParams({ query });
  }, 250);

  onChangeSearch(e) {
    this.log('action', 'onChangeSearch');
    this.props.mutator.itemCount.replace(INITIAL_RESULT_COUNT);
    const query = e.target.value;
    this.setState({ searchTerm: query });
    this.log('action', `will search for '${query}'`);
    this.performSearch(query);
  }

  onClearSearch() {
    this.log('action', 'onClearSearch');
    const appPath = (_.get(packageInfo, ['stripes', 'home']) ||
      _.get(packageInfo, ['stripes', 'route']));
    const path = `${appPath}/reserves`;
    this.setState({
      searchTerm: '',
      sortOrder: 'title',
      filters: {},
      selectedCourseId: '',
      selectedInstructorId: '',
      selectedReserve: {},
    });
    this.props.history.push(path);
  }

  /** mutli-column-list */
  onSelectRow(e, reserve) {
    const reserveId = reserve.id;
    this.log('action', `onSelectRow ${reserveId}`);
    this.setState({ selectedReserve: reserve });
  };

  onSort(e, meta) {
    const newOrder = meta.alias;
    const oldOrder = this.state.sortOrder || '';
    const orders = oldOrder ? oldOrder.split(',') : [];
    if (orders[0] && newOrder === orders[0].replace(/^-/, '')) {
      orders[0] = `-${orders[0]}`.replace(/^--/, '');
    } else {
      orders.unshift(newOrder);
    }
    const sortOrder = orders.slice(0, 2).join(',');
    this.log('action', `sorted by ${sortOrder}`);
    this.setState({ sortOrder });
    this.transitionToParams({ sort: sortOrder });
  };

  onNeedMore = () => {
    this.log('action', 'onNeedMore');
    this.props.mutator.itemCount.replace(this.props.resources.itemCount + RESULT_COUNT_INCREMENT);
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
        href={`/waitlists/reserves/${rowData.id}`} 
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
    this.log('action', 'render Reserves');

    const {
      onSubmit,
      onClose,
      resources,
    } = this.props;

    const closeButton = (
      <PaneMenu>
        <button onClick={onClose} title="close" aria-label="Close New Waitlist Dialog">
          <span style={{ fontSize: '30px', color: '#999', lineHeight: '18px' }} >&times;</span>
        </button>
      </PaneMenu>
    );
    const submitButton = (
      <PaneMenu>
        <Button
          id="clickable-create-waitlist"
          title="Save"
          onClick={() => onSubmit(this.state.selectedReserve)}
          disabled={Object.keys(this.state.selectedReserve).length === 0}
          buttonStyle="primary paneHeaderNewButton">
          Save
        </Button>
      </PaneMenu>
    );

    const searchHeader = (
      <FilterPaneSearch
        id="SearchField"
        onChange={this.onChangeSearch}
        onClear={this.onClearSearch}
        resultsList={this.resultsList}
        value={this.state.searchTerm} />
    );
    const courses = (resources.courses || {}).records || [];
    const courseOptions = courses.map(c => ({
      label: c.name,
      value: c.id,
      selected: false,
    }));
    const instructors = (resources.instructors || {}).records || [];
    const instructorOptions = instructors.map(i => ({
      label: i.name,
      value: i.id,
      selected: false,
    }));

    const resultsFormatter = {};
    const maybeTerm = this.state.searchTerm ? ` for "${this.state.searchTerm}"` : '';
    const maybeSpelling = this.state.searchTerm ? 'spelling and ' : '';
    const reserves = (resources.items || {}).records || [];
    const itemCount = resources.itemCount || 0;

    return (
      <Layer isOpen={true} label="Add New Waitlist">
        <Paneset>
          {/** container pane */}
          <Pane
            defaultWidth="100%"
            firstMenu={closeButton}
            lastMenu={submitButton}>
            <Paneset>

              {/** filter pane */}
              <Pane
                id="filter-pane"
                defaultWidth="30%"
                header={searchHeader}>
                <Row>
                  <Col xs={12}>
                    <Select
                      id="filteritem_course"
                      label="Course:"
                      name="course"
                      value={this.state.selectedCourseId}
                      fullWidth
                      onChange={this.onChangeFilter}
                      dataOptions={[{ label: 'Select Course', value: '' }, ...courseOptions]} />
                  </Col>
                </Row>
                <Row>
                  <Col xs={12}>
                    <Select
                      id="filteritem_instructor"
                      label="Instructor:"
                      name="instructor"
                      value={this.state.selectedInstructorId}
                      fullWidth
                      onChange={this.onChangeFilter}
                      dataOptions={[{ label: 'Select Instructor', value: '' }, ...instructorOptions]} />
                  </Col>
                </Row>
              </Pane>

              {/** results pane */}
              <Pane
                id="results-pane"
                paneTitle={
                  <div style={{ textAlign: 'center' }}>
                    <strong>Select Course Reserve</strong>
                    <div>
                      <em>{this.props.resources.items && this.props.resources.items.hasLoaded && this.props.resources.items.other ? this.props.resources.items.other.totalRecords : ''} Result{reserves.length === 1 ? '' : 's'} Found</em>
                    </div>
                  </div>
                }
                defaultWidth="70%">
                <MultiColumnList
                  contentData={reserves}
                  selectedRow={this.state.selectedReserve}
                  rowMetadata={['title', 'instructor', 'course']}
                  formatter={{}}
                  onRowClick={this.onSelectRow}
                  onHeaderClick={this.onSort}
                  onNeedMoreData={this.onNeedMore}
                  visibleColumns={['title', 'barcode', 'location', 'instructor', 'course']}
                  sortOrder={this.state.sortOrder.replace(/^-/, '').replace(/,.*/, '')}
                  sortDirection={this.state.sortOrder.startsWith('-') ? 'descending' : 'ascending'}
                  isEmptyMessage={`No results found${maybeTerm}. Please check your ${maybeSpelling}filters.`}
                  loading={this.props.reserves ? this.props.reserves.isPending : false}
                  autosize
                  virtualize
                  ariaLabel={'Item search results'}
                  rowFormatter={this.anchoredRowFormatter}
                  containerRef={(ref) => { this.resultsList = ref; }} />
              </Pane>
            </Paneset>
          </Pane>
        </Paneset>
      </Layer>
    );
  }
}

export default Reserves;
