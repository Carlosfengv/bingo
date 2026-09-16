import * as React from "react";

const PortalContainerContext = React.createContext(null);

function PortalContainerProvider({ container, children }) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

function usePortalContainer() {
  return React.useContext(PortalContainerContext);
}

export { PortalContainerProvider, usePortalContainer };
