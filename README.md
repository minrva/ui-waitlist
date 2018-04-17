# ui-waitlist

Copyright (C) 2017 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## Introduction

This is a [Stripes](https://github.com/folio-org/stripes-core/) UI module
for managing short-loan waitlists.

## Disclaimer

The best way to install `ui-waitlist` is via yarn via a public repository. The second best way is to use one of yarn's various techniques to get a local repository to work alongside the FOLIO public repositories.

Due to documented idiosyncrasies of yarn, for now, we have chosen to do development in the following non-recommended but functional way.

## Install Stripes Platform

1. Download `stripes-demo-platform`.
    ```bash
    mkdir ~/Desktop/folio
    mkdir ~/Desktop/folio/ui
    cd ~/Desktop/folio/ui
    git clone --recursive https://github.com/folio-org/stripes-demo-platform
    cd stripes-demo-platform
    git checkout 178976520471a17fa8816db884c6859f2ed3c67b .
1. *Optional*: [Yarn Troubleshooting Step](https://github.com/yarnpkg/yarn/issues/3507)
    ```bash
    yarn global add node-gyp
    ```
1. Replace `config` in `stripes.config.js`.
    ```bash
    code stripes.config.js
    config: {
        hasAllPerms: true,
        reduxLog: true
    }
    ```
1. Fix `yarn.lock` file.
    ```bash
    code yarn.lock
    # replace 6e336e55b41f628e98c63e3c83d65a3b6cc2d7d9
    # with 639b3104e6954d30cd64d2ce6790dd9394b2c0cb
    ```
1. Install the platform.
    ```bash
    yarn config set @folio:registry https://repository.folio.org/repository/npm-folio/
    yarn install
    ```

## Modify MCLRenderer.js

The MultiColumnList must be edited in order to allow the list to resize properly after a new item has been added to it.

1. Load MCLRenderer.js into an editor.
    ```bash
    code ~/Desktop/folio/ui/stripes-demo-platform/node_modules/@folio/stripes-components/lib/MultiColumnList/MCLRenderer.js
    ```
1. Comment out the `if statement` on line 225.
    ```javascript
    // if (this.state.averageRowHeight === 0) {
    const avg = this.updateAverageHeight();
    const dimensions = this.updateDimensions(this.props.height, this.props.contentData, avg);
    this.setState({ averageRowHeight: avg, ...dimensions });
    // }
    ```

## Install UI-Waitlist

1. Load the Stripes platform configuration file into an editor.
    ``` bash
    code ~/Desktop/folio/ui/stripes-demo-platform/stripes.config.js
    ```
1. Add `@folio/waitlists: {}` as an entry to the `modules` section.
    ```javascript
        modules: {
            ...
            '@folio/circulation': {},
            '@folio/waitlists': {},
            '@folio/developer': {},
            ...
        }
    ```
1. Download `ui-waitlist` to the `node_modules/@folio` directory and rename the directory.
    ```bash
    cd ~/Desktop/folio/ui/stripes-demo-platform/node_modules/@folio
    git clone https://code.library.illinois.edu/scm/fol/ui-waitlist.git
    mv ui-waitlist waitlists
    ```

## Deploy UI-Waitlist

1. Deploy the corresponding Okapi services by following [mod-waitlist README](https://code.library.illinois.edu/projects/FOL/repos/mod-waitlist/browse/README.md).
1. Deploy the `stripes-demo-platform`.
    ```bash
    cd ~/Desktop/folio/ui/stripes-demo-platform
    yarn start
    ```

## Additional information

Other FOLIO Developer documentation is at [dev.folio.org](http://dev.folio.org/)
[Stripes Connect](https://github.com/folio-org/stripes-connect/blob/master/doc/api.md)
