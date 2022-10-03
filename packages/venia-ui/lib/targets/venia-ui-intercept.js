/**
 * @module VeniaUI/Targets
 */
import { Targetables } from '@magento/pwa-buildpack';
import CategoryListProductAttributes from './CategoryListProductAttributes';
import RichContentRendererList from './RichContentRendererList';
import makeRoutesTarget from './makeRoutesTarget';
import CheckoutPagePaymentsList from './CheckoutPagePaymentsList';
import SavedPaymentTypes from './SavedPaymentTypes';
import EditablePaymentTypes from './EditablePaymentTypes';
import SummaryPaymentTypes from './SummaryPaymentTypes';
import RootShimmerTypes from './RootShimmerTypes';

export default veniaTargets => {
    const venia = Targetables.using(veniaTargets);

    venia.setSpecialFeatures(
        'cssModules',
        'esModules',
        'graphqlQueries',
        'rootComponents',
        'upward',
        'i18n'
    );

    makeRoutesTarget(venia);

    const renderers = new RichContentRendererList(venia);

    renderers.add({
        componentName: 'PlainHtmlRenderer',
        importPath: './plainHtmlRenderer'
    });

    const checkoutPagePaymentsList = new CheckoutPagePaymentsList(venia);
    checkoutPagePaymentsList.add({
        paymentCode: 'braintree',
        importPath:
            '@magento/venia-ui/lib/components/CheckoutPage/PaymentInformation/creditCard'
    });

    const savedPaymentTypes = new SavedPaymentTypes(venia);
    savedPaymentTypes.add({
        paymentCode: 'braintree',
        importPath:
            '@magento/venia-ui/lib/components/SavedPaymentsPage/creditCard'
    });

    const editablePayments = new EditablePaymentTypes(venia);
    editablePayments.add({
        paymentCode: 'braintree',
        importPath:
            '@magento/venia-ui/lib/components/CheckoutPage/PaymentInformation/editCard'
    });

    const summaryPagePaymentTypes = new SummaryPaymentTypes(venia);
    summaryPagePaymentTypes.add({
        paymentCode: 'braintree',
        importPath:
            '@magento/venia-ui/lib/components/CheckoutPage/PaymentInformation/braintreeSummary'
    });

    new CategoryListProductAttributes(venia);

    const rootShimmerTypes = new RootShimmerTypes(venia);
    rootShimmerTypes.add({
        shimmerType: 'CATEGORY_SHIMMER',
        importPath:
            '@magento/venia-ui/lib/RootComponents/Category/categoryContent.shimmer'
    });
}
