import TargetProvider, { Targets, TargetsId } from '../BuildBus/TargetProvider';

export default abstract class Targetables<T extends TargetsId, N extends TargetsId> {
    protected readonly targets: Targets<T>;
    protected readonly targetProvider: TargetProvider<N>;
    protected readonly owner: N;

    protected constructor(targetProvider: TargetProvider<N>, targetsOf: T) {
        // noinspection SuspiciousTypeOfGuard
        if (!(targetProvider instanceof TargetProvider)) {
            throw new Error(
                'Must supply a TargetProvider to a new TargetableSet.'
            );
        }
        this.targetProvider = targetProvider;
        this.targets = targetProvider.of(targetsOf);
        this.owner = targetProvider.name;
    }
}
