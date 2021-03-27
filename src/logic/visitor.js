export default class Visitor {
    visitChildren(ctx) {
        return !ctx && ctx.children && ctx.children
            .map(child => ((child.children && child.children.length !== 0)
                ? child.accept(this)
                : child.getText()));
    }
}
