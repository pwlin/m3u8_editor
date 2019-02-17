import {connect} from 'react-redux'
import {createStructuredSelector} from 'reselect'
import {setControl} from 'containers/ListEditor/state/actions'
import {makeSelectCompareVisibility} from 'containers/ListEditor/state/selectors'

const mapProps = createStructuredSelector({
	compareVisible: makeSelectCompareVisibility(),
})

const mapActions = dispatch => ({
	setControl: ({key}) => dispatch(setControl(key))
})

export default Component => connect(mapProps, mapActions)(Component)