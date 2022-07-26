import { inspect } from 'util';
import AbstractOperation, {
    EmptyObject,
    OperationContext, OperationId,
    OperationRequest
} from './AbstractOperation';
import SimpleOperation from './SimpleOperation';
import AppendOperation from './operations/AppendOperation';
import RemovePropsOperation from './operations/RemovePropsOperation';
import ReplaceOperation from './operations/ReplaceOperation';
import PrependOperation from './operations/PrependOperation';
import SetPropsOperation from './operations/SetPropsOperation';
import SurroundOperation from './operations/SurroundOperation';
import AddClassNameOperation from './operations/AddClassNameOperation';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OperationImpl<S extends EmptyObject = any, P extends EmptyObject = any, I extends AbstractOperation<S, P>
    = AbstractOperation<S, P>> = new(request: OperationRequest<P>, context: OperationContext) => I;

export default class Operation {
    static defined: Record<OperationId, OperationImpl> = {
        append: AppendOperation,
        prepend: PrependOperation,
        removeProps: RemovePropsOperation,
        replace: ReplaceOperation,
        setProps: SetPropsOperation,
        surround: SurroundOperation,
        addClassName: AddClassNameOperation,
        insertAfter: SimpleOperation,
        insertBefore: SimpleOperation,
        remove: SimpleOperation,
    };

    /**
     * Define a new JSX operation by name and implementation, which can then be requested by name by a transformRequest and executed by the Babel plugin.
     *
     * @static
     * @param {string} opName - Name of the operation
     * @param {typeof Operation} OperationType - A subclass of Operation with overrides for the `run` method and optionally the `match` and/or `setup` methods.
     * @memberof Operation
     */
    static define(opName: OperationId, OperationType: OperationImpl) {
        Operation.defined[opName] = OperationType;
    }

    static fromRequest<T extends AbstractOperation = AbstractOperation>(request: OperationRequest, {
        parser,
        file,
        babel
    }: OperationContext): T {
        const { operation } = request.options;
        const MatchingOperation = this.defined[operation];
        if (MatchingOperation) {
            return new MatchingOperation(request, { parser, file, babel }) as T;
        }
        throw new Error(
            `Invalid request ${inspect(
                request
            )}: operation name "${operation}" unrecognized`
        );
    }
}

// @TODO add static imports instead of this magic
// /**
//  * Register a new JSX operation just by creating a new file in this directory
//  * that exports a run function, or a { setup, match, run } tuple.
//  *
//  * The below code will scan this directory for those files, and then define
//  * operations named after the filenames themselves.
//  *
//  */
// const ignore = new Set(['index.js']);
// for (const filename of fs.readdirSync(path.join(__dirname, 'operations'))) {
//     if (!ignore.has(filename)) {
//         Operation.define(
//             filename.split('.')[0],
//             require(`./operations/${filename}`)(Operation)
//         );
//     }
// }

/** Type definitions related to: Operation */

/**
 * Defines an operation that can be run on the source of React component during build.
 *
 * @interface OperationDefinition
 *
 */

/**
 * Run the actual operation, modifying the passed AST in place.
 * @function
 * @name OperationDefinition#run
 * @param {BabelNodePath} path - [Babel `NodePath`](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths object to use, representing the current JSX element in the file's syntax tree.
 * @returns {undefined}
 */

/**
 * Test the current JSX element to see if this operation should run on it.
 * Overrides the default implementation of `match`, which matches using the JSX
 * name and properties in `this.request.element`. The default implementation is
 * can be called at `this.defaultMatch(path)` or `self.defaultMatch()` using
 * the second `self` argument.
 * @function
 * @name OperationDefinition#match
 * @param {BabelNodePath} path - [Babel `NodePath`](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths object to match, representing the current JSX element in the file's syntax tree.
 */

/**
 * Initialize the operation, setting up any custom data structures and reading
 * any metadata about the file.
 * @function
 * @name OperationDefinition#setup
 * @param {TransformRequest} request - The TransformRequest passed to this instance. Also available at `this.request`.
 */
