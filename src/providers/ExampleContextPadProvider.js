export default class ExampleContextPadProvider{

    static $inject =["connect", "contextPad", "modeling", "elementFactory", "create", "popupMenu"]

    constructor(connect, contextPad, modeling, elementFactory, create, popupMenu){
        this.connect= connect;
        this.modeling= modeling;
        this.elementFactory= elementFactory;
        this.create= create;
        this.popupMenu = popupMenu;

        contextPad.registerProvider(this);
    }


    getContextPadEntries(element){
        
        const { connect, modeling, elementFactory } = this;
        
        const removeElement = () => {modeling.removeElements([element])};

        const startConnect = (event, element, autoActivate) => {connect.start(event, element, autoActivate);}

        const createAdjacent = (type) => {
            const parent = element.parent;
            if (!parent) return;

            const defaultSizes = {
                "petri:transition": { width: 100, height: 80 },
                "petri:place": { width: 80, height: 80 }
            };

            const size = defaultSizes[type] || { width: 80, height: 60 };

            // choose side based on connections: right if outgoing present (or none), left if only incoming
            const hasOutgoing = Array.isArray(element.outgoing) && element.outgoing.length > 0;
            const hasIncoming = Array.isArray(element.incoming) && element.incoming.length > 0;
            const placeRight = !hasOutgoing || hasIncoming;

            // compute CENTER coordinates for createShape position
            const centerY = element.y + element.height / 2;
            const centerX = placeRight
                ? element.x + element.width + 50 + size.width / 2
                : element.x - 30 - size.width / 2;

            // create shape without preset x/y; modeling will position it by center
            const shape = elementFactory.createShape({
                type,
                width: size.width,
                height: size.height
            });

            const created = modeling.createShape(shape, { x: centerX, y: centerY }, parent);

            // connect selected element -> newly created element
            modeling.createConnection(element, created, { type: 'petri:connection' }, parent);
        };


        const replaceElement = () => {
          const parent = element.parent;
          if (!parent) return;

          let newType;
          let newSize;

          // Replace transition with empty_transition or vice versa
          if (element.type === "petri:transition") {
            newType = "petri:empty_transition";
            newSize = { width: 14, height: 80 };
          } else if (element.type === "petri:empty_transition") {
            newType = "petri:transition";
            newSize = { width: 100, height: 80 };
          } else {
            // Not a transition type, do nothing
            return;
          }

          // Create new shape at the same position
          const shape = elementFactory.createShape({
            type: newType,
            width: newSize.width,
            height: newSize.height
          });

          // Calculate center position to maintain same center point
          const centerX = element.x + element.width / 2;
          const centerY = element.y + element.height / 2;

          // Preserve connections
          const incomingConnections = element.incoming ? [...element.incoming] : [];
          const outgoingConnections = element.outgoing ? [...element.outgoing] : [];

          // Create new element at the same center position
          const newElement = modeling.createShape(shape, { x: centerX, y: centerY }, parent);

          // Reconnect incoming connections
          incomingConnections.forEach(connection => {
            modeling.reconnectEnd(connection, newElement, connection.waypoints[connection.waypoints.length - 1]);
          });

          // Reconnect outgoing connections
          outgoingConnections.forEach(connection => {
            modeling.reconnectStart(connection, newElement, connection.waypoints[0]);
          });

          // Remove old element
          modeling.removeElements([element]);
        }

        const entries = {
            delete: {
              group: 'edit',
              className: 'context-pad-icon-remove',
              title: 'Remove',
              action: {
                click: removeElement,
                dragstart: removeElement
              }
            },
            connect: {
              group: 'edit',
              className: 'context-pad-icon-connect',
              title: 'Connect', 
              action: {
                click: startConnect,
                dragstart: startConnect
              }
            },
        };

        if (element.type === 'petri:place') {
            entries.transition = {
              group: 'edit',
              className: 'context-pad-icon-transition',
              title: 'Create transition',
              action: {
                click: () => createAdjacent('petri:transition')
              }
            };
        } else if (element.type === 'petri:transition' || element.type === 'petri:empty_transition') {
            entries.place = {
              group: 'edit',
              className: 'context-pad-icon-place',
              title: 'Create place',
              action: {
                click: () => createAdjacent('petri:place')
              }
            };
        }

        // Add tool icon for all element types
        entries.tool = {
          group: 'tools',
          className: 'context-pad-icon-tool',
          title: 'Tool action',
          action: {
            click: (event) => {
              const menuEntries = {
                'tokens': {
                  label: 'Set Tokens',
                  action: () => {
                    const tokens = window.prompt('Enter number of tokens:', '0');
                    if (tokens !== null) {
                      console.log(`Setting ${tokens} tokens on ${element.type}`);
                      if (!element.businessObject) element.businessObject = {};
                      element.businessObject.tokens = parseInt(tokens) || 0;
                    }
                  }
                },
                'properties': {
                  label: 'Properties',
                  action: () => {
                    console.log('Opening properties for', element.type);
                    alert(`Properties for ${element.type}\nID: ${element.id}\nType: ${element.type}`);
                  }
                }
              };
              
              const position = {
                x: event.x || event.clientX,
                y: event.y || event.clientY
              };
              
              this.popupMenu.open(element, 'menu', position); 
            }
          }
        };

        // Add replace option only for transitions
        if (element.type === 'petri:transition') {
          entries.replace = {
            group: 'edit',
            className: 'context-pad-icon-replace',
            title: 'Replace with empty transition',
            action: {
              click: replaceElement
            }
          };
        } else if (element.type === 'petri:empty_transition') {
          entries.replace = {
            group: 'edit',
            className: 'context-pad-icon-replace',
            title: 'Replace with transition',
            action: {
              click: replaceElement
            }
          };
        }

        return entries;
    }
}

