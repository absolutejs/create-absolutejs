import { confirm, isCancel } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getAgentic = async () => {
	const agentic = await confirm({
		initialValue: false,
		message:
			'Add the agent-first stack (auth, actions, MCP, wallet, credentials, and conformance)?'
	});
	if (isCancel(agentic)) abort();

	return agentic;
};
