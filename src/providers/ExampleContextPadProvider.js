export default class ExampleContextPadProvider{

    static $inject =["connect", "contextPad", "modeling", "elementFactory", "create"]

    constructor(connect, contextPad, modeling, elementFactory, create){
        this.connect= connect;
        this.modeling= modeling;
        this.elementFactory= elementFactory;
        this.create= create;

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
            }
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

        return entries;
    }
}
