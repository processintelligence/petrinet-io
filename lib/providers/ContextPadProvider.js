export default class CustomContextPadProvider{

    static $inject =["connect", "contextPad", "modeling", "elementFactory", "create", "popupMenu", "idCounterService", "selection"]

    constructor(connect, contextPad, modeling, elementFactory, create, popupMenu, idCounterService, selection){
        this.connect= connect;
        this.modeling= modeling;
        this.elementFactory= elementFactory;
        this.create= create;
        this.popupMenu = popupMenu;
        this.idCounterService = idCounterService;
        this.selection = selection;
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
                "petri:transition": { width: 40, height: 40 },
                "petri:place": { width: 30, height: 30 }
            };

            const size = defaultSizes[type] || { width: 40, height: 40 };

            // choose side based on connections: right if outgoing present (or none), left if only incoming
            const hasOutgoing = Array.isArray(element.outgoing) && element.outgoing.length > 0;
            const hasIncoming = Array.isArray(element.incoming) && element.incoming.length > 0;
            const placeRight = !hasOutgoing || hasIncoming;

            // compute CENTER coordinates for createShape position
            const centerY = element.y + element.height / 2;
            const centerX = placeRight
                ? element.x + element.width + 50 + size.width / 2
                : element.x - 30 - size.width / 2;

            // create shape with auto-generated ID
            const shapeConfig = {
                id: this.idCounterService.getNextId(type),
                type,
                width: size.width,
                height: size.height
            };
            
            // Add businessObject for places
            if (type === 'petri:place') {
                shapeConfig.businessObject = { tokens: 0 };
            }
            
            const shape = elementFactory.createShape(shapeConfig);
            const created = modeling.createShape(shape, { x: centerX, y: centerY }, parent);

            // connect selected element -> newly created element
            // console.log(element, created, { type: 'petri:connection' }, parent);
            modeling.createConnection(element, created, { type: 'petri:connection' }, parent);

            this.selection.select(created);
        };


        const replaceElement = () => {
          const parent = element.parent;
          if (!parent) return;

          let newType;
          let newSize;

          // Replace transition with empty_transition or vice versa
          if (element.type === "petri:transition") {
            newType = "petri:empty_transition";
            newSize = { width: 10, height: 50 };
          } else if (element.type === "petri:empty_transition") {
            newType = "petri:transition";
            newSize = { width: 40, height: 40 };
          } else {
            // Not a transition type, do nothing
            return;
          }

          // Create new shape at the same position with auto-generated ID
          const shape = elementFactory.createShape({
            id: this.idCounterService.getNextId(newType),
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
              className: 'bpmn-icon-trash',
              title: 'Remove',
              action: {
                click: removeElement,
                dragstart: removeElement
              }
            },
            connect: {
              group: 'edit',
              className: 'bpmn-icon-connection',
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
              className: 'bpmn-icon-task',
              title: 'Create transition',
              action: {
                click: () => createAdjacent('petri:transition')
              }
            };
        } else if (element.type === 'petri:transition' || element.type === 'petri:empty_transition') {
            entries.place = {
              group: 'edit',
              className: 'bpmn-icon-start-event-none',
              title: 'Create place',
              action: {
                click: () => createAdjacent('petri:place')
              }
            };
        }

        // Add tool icon for all element types
        entries.tool = {
          group: 'tools',
          className: 'bpmn-icon-screw-wrench',
          title: 'Tool action',
          action: {
            click: (event) => {
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
            className: 'palette-icon-create-empty-transition',
            title: 'Replace with empty transition',
            action: {
              click: replaceElement
            }
          };
        } else if (element.type === 'petri:empty_transition') {
          entries.replace = {
            group: 'edit',
            className: 'bpmn-icon-task',
            title: 'Replace with transition',
            action: {
              click: replaceElement
            }
          };
        }

        return entries;
    }
}

