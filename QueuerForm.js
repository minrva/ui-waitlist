import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Field, reduxForm } from 'redux-form';
import Link from 'react-router-dom/Link';
import Route from 'react-router-dom/Route';

import Pane from '@folio/stripes-components/lib/Pane';
import PaneMenu from '@folio/stripes-components/lib/PaneMenu';
import Paneset from '@folio/stripes-components/lib/Paneset';
import MultiColumnList from '@folio/stripes-components/lib/MultiColumnList';
import Button from '@folio/stripes-components/lib/Button';

import { Row, Col } from '@folio/stripes-components/lib/LayoutGrid';
import TextField from '@folio/stripes-components/lib/TextField';
import Select from '@folio/stripes-components/lib/Select';

import Layer from '@folio/stripes-components/lib/Layer';

class QueuerForm extends React.Component {
    constructor(props) {
        super(props);

        // logging
        const logger = props.stripes.logger;
        this.log = logger.log.bind(logger);        
    };

    render() {
        this.log('action', `render QueuerForm`);

        const {
            handleSubmit,
            reset,  // eslint-disable-line no-unused-vars
            submitting,
            onCancelNewQueuer,
            initialValues,
            resources,
            stripes,
            location
        } = this.props;

        const containerStyle = {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            width: '100%',
            position: 'absolute',
        };

        const closeButton = (
            <PaneMenu>
                <button onClick={onCancelNewQueuer} title="close" aria-label="Close New Queuer Dialog">
                    <span style={{ fontSize: '30px', color: '#999', lineHeight: '18px' }} >&times;</span>
                </button>
            </PaneMenu>
        );

        const submitButton = (
            <PaneMenu>
                <Button
                    id="clickable-new-queuer"
                    title="Save"
                    onClick={handleSubmit}
                    buttonStyle="primary paneHeaderNewButton"
                    type="submit"
                    disabled={submitting}>
                    Save
                </Button>
            </PaneMenu>
        );

        return (
            <Paneset isRoot>
                <Pane 
                    id="main-pane" 
                    defaultWidth="100%" 
                    firstMenu={closeButton} 
                    lastMenu={submitButton} 
                    paneTitle={'Queuer'}>
                    <Row>
                        <Col sm={5} smOffset={1}>
                            <h2>Queuer Record</h2>
                            <Field label="Username" name="username" id="addqueuer_username" component={TextField} required fullWidth />
                            <Field label="Email" name="email" id="addqueuer_email" component={TextField} required fullWidth />
                        </Col>
                    </Row>
                </Pane>
            </Paneset>
        );
    }
}

export default reduxForm({
    form: 'queuerForm',
})(QueuerForm);
