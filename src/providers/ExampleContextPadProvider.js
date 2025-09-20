export default class ExampleContextPadProvider{

    static $inject =["connect", "contextPad", "modeling"]

    constructor(connect, contextPad, modeling){
        this.connect= connect;
        this.modeling= modeling;

        contextPad.registerProvider(this);
    }


    getContextPadEntries(element){
        
        const { connect, modeling } = this;
        
        const removeElement = () => {modeling.removeElements([element])};

        const startConnect = (event, element, autoActivate) => {connect.start(event, element, autoActivate);}

        return {
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
        }}
