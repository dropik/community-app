import LoadingIndicator from 'components/LoadingIndicator';
import React from 'react';
import { AppChunk } from 'topcoder-react-utils';

export default function DashboardRoute(props) {
  return (
    <AppChunk
      chunkName="dashboard/chunk"
      exact
      path="/home"
      renderClientAsync={() => import(/* webpackChunkName: "dashboard/chunk" */'containers/Dashboard')
        .then(({ default: Dashboard }) => (
          <Dashboard {...props} />
        ))
      }
      renderPlaceholder={() => <LoadingIndicator />}
    />
  );
}
