export interface SerializedTrackable {
    type: string;
    id: string;
    parent?: SerializedTrackable;
    [key: string]: unknown;
}
export type OutCallback = (trackable: SerializedTrackable, ...args: unknown[]) => unknown;

export type TrackingOwner = Trackable|OutCallback;

export interface TrackableInterface {
    attach: (identifier: string, owner: TrackingOwner) => void;
    track: (...args: unknown[]) => unknown;
}

export default class Trackable implements TrackableInterface {
    protected _identifier?: string;
    private _parent?: Trackable;

    /**
     * Enable all active Trackable instances. **Do not run in production**.
     * Carries a possibly significant performance cost.
     */
    static enableTracking() {
        Trackable.prototype.track = function (...args: unknown[]): unknown {
            return this._out(this.toJSON(), ...args);
        }
    }

    /**
     * Disable all active Trackable instances. The parent logging callback will
     * not be called.
     */
    static disableTracking() {
        Trackable.prototype.track = function (...args: unknown[]): unknown {
            return
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    track(...args: unknown[]): unknown {
        return;
    }

    /**
     * Attach this Trackable to a tree. Give it a name and an owner. If the
     * owner is a Trackable, then this Trackable becomes a child node of the
     * owner. If the owner is a function, then this Trackable becomes a root
     * node, which will log all of its {@link Trackable#track} calls *and* its
     * descendents' calls to the `owner` function.
     *
     * @see Trackable.spec.js
     *
     * @param {string} identifier - String identifier of this Trackable
     * @param {(Trackable | Function)} owner - Parent or root log callback
     */
    attach(identifier: string, owner: TrackingOwner) {
        this._identifier = identifier;
        if (owner instanceof Trackable) {
            this._parent = owner;
        } else if (typeof owner === 'function') {
            this._out = owner;
        }
    }

    toJSON(): SerializedTrackable {
        const json: SerializedTrackable = {
            type: this.constructor.name,
            id: this._ensureIdentifier(),
        };
        if (this._parent) {
            json.parent = this._parent.toJSON()
        }
        return json;
    }

    _ensureIdentifier(): string {
        if (!this.hasOwnProperty('_identifier') || !this._identifier) {
            throw new Error(
                'Trackable must be initialized with tracker.attach'
            );
        }
        return this._identifier;
    }

    private _out(trackable: SerializedTrackable, ...args: unknown[]): unknown {
        if (!this._parent) {
            throw new Error(
                'Trackable must be initialized with tracker.attach'
            );
        }
        return this._parent._out(trackable, ...args);
    }

}
