/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/base/common/actions';
import { URI } from 'vs/base/common/uri';
import 'vs/css!./media/searchEditor';
import { ICodeEditor, isDiffEditor } from 'vs/editor/browser/editorBrowser';
import { localize } from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ILabelService } from 'vs/platform/label/common/label';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IViewsService } from 'vs/workbench/common/views';
import { getSearchView } from 'vs/workbench/contrib/search/browser/searchActions';
import { SearchResult } from 'vs/workbench/contrib/search/common/searchModel';
import * as Constants from 'vs/workbench/contrib/searchEditor/browser/constants';
import { SearchEditor } from 'vs/workbench/contrib/searchEditor/browser/searchEditor';
import { getOrMakeSearchEditorInput, SearchEditorInput } from 'vs/workbench/contrib/searchEditor/browser/searchEditorInput';
import { serializeSearchResultForEditor } from 'vs/workbench/contrib/searchEditor/browser/searchEditorSerialization';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ISearchConfigurationProperties } from 'vs/workbench/services/search/common/search';

export const toggleSearchEditorCaseSensitiveCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeControl as SearchEditor).toggleCaseSensitive();
	}
};

export const toggleSearchEditorWholeWordCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeControl as SearchEditor).toggleWholeWords();
	}
};

export const toggleSearchEditorRegexCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeControl as SearchEditor).toggleRegex();
	}
};

export const toggleSearchEditorContextLinesCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeControl as SearchEditor).toggleContextLines();
	}
};


export class OpenSearchEditorAction extends Action {

	static readonly ID: string = Constants.OpenNewEditorCommandId;
	static readonly LABEL = localize('search.openNewEditor', "Open New Search Editor");

	constructor(id: string, label: string,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super(id, label, 'codicon-new-file');
	}

	update() {
		// pass
	}

	get enabled(): boolean {
		return true;
	}

	async run() {
		await this.instantiationService.invokeFunction(openNewSearchEditor);
	}
}

export class OpenResultsInEditorAction extends Action {

	static readonly ID: string = Constants.OpenInEditorCommandId;
	static readonly LABEL = localize('search.openResultsInEditor', "Open Results in Editor");

	constructor(id: string, label: string,
		@IViewsService private viewsService: IViewsService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super(id, label, 'codicon-go-to-file');
	}

	get enabled(): boolean {
		const searchView = getSearchView(this.viewsService);
		return !!searchView && searchView.hasSearchResults();
	}

	update() {
		this._setEnabled(this.enabled);
	}

	async run() {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			await this.instantiationService.invokeFunction(createEditorFromSearchResult, searchView.searchResult, searchView.searchIncludePattern.getValue(), searchView.searchExcludePattern.getValue());
		}
	}
}

const openNewSearchEditor =
	async (accessor: ServicesAccessor) => {
		const editorService = accessor.get(IEditorService);
		const telemetryService = accessor.get(ITelemetryService);
		const instantiationService = accessor.get(IInstantiationService);
		const configurationService = accessor.get(IConfigurationService);

		const activeEditor = editorService.activeTextEditorWidget;
		let activeModel: ICodeEditor | undefined;
		let selected = '';
		if (activeEditor) {
			if (isDiffEditor(activeEditor)) {
				if (activeEditor.getOriginalEditor().hasTextFocus()) {
					activeModel = activeEditor.getOriginalEditor();
				} else {
					activeModel = activeEditor.getModifiedEditor();
				}
			} else {
				activeModel = activeEditor as ICodeEditor;
			}
			const selection = activeModel?.getSelection();
			selected = (selection && activeModel?.getModel()?.getValueInRange(selection)) ?? '';
		} else {
			if (editorService.activeEditor instanceof SearchEditorInput) {
				const active = editorService.activeControl as SearchEditor;
				selected = active.getSelected();
			}
		}

		telemetryService.publicLog2('searchEditor/openNewSearchEditor');

		const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { config: { query: selected } });
		const editor = await editorService.openEditor(input, { pinned: true }) as SearchEditor;

		if (selected && configurationService.getValue<ISearchConfigurationProperties>('search').searchOnType) {
			editor.triggerSearch();
		}
	};

export const createEditorFromSearchResult =
	async (accessor: ServicesAccessor, searchResult: SearchResult, rawIncludePattern: string, rawExcludePattern: string) => {
		if (!searchResult.query) {
			console.error('Expected searchResult.query to be defined. Got', searchResult);
			return;
		}

		const editorService = accessor.get(IEditorService);
		const telemetryService = accessor.get(ITelemetryService);
		const instantiationService = accessor.get(IInstantiationService);
		const labelService = accessor.get(ILabelService);


		telemetryService.publicLog2('searchEditor/createEditorFromSearchResult');

		const labelFormatter = (uri: URI): string => labelService.getUriLabel(uri, { relative: true });

		const { text, matchRanges } = serializeSearchResultForEditor(searchResult, rawIncludePattern, rawExcludePattern, 0, labelFormatter, true);

		const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { text });
		await editorService.openEditor(input, { pinned: true });
		input.setMatchRanges(matchRanges);
	};
