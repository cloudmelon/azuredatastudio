/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseProjectTreeItem, MessageTreeItem } from './baseTreeItem';
import * as constants from '../../common/constants';
import { ProjectRootTreeItem } from './projectTreeItem';
import { DataSource } from '../dataSources/dataSources';
import { SqlConnectionDataSource } from '../dataSources/sqlConnectionStringSource';

export class DataSourcesTreeItem extends BaseProjectTreeItem {
	private dataSources: DataSourceTreeItem[] = [];

	constructor(project: ProjectRootTreeItem) {
		super(vscode.Uri.file(path.join(project.uri.path, constants.dataSourcesNodeName)), project);

		this.construct();
	}

	private construct() {
		for (const dataSource of (this.parent as ProjectRootTreeItem).project.dataSources) {
			this.dataSources.push(constructDataSourceTreeItem(dataSource, this));
		}
	}

	public get children(): BaseProjectTreeItem[] {
		return this.dataSources;
	}

	public get treeItem(): vscode.TreeItem {
		return new vscode.TreeItem(this.uri, vscode.TreeItemCollapsibleState.Collapsed);
	}
}

abstract class DataSourceTreeItem extends BaseProjectTreeItem { }

export class SqlConnectionDataSourceTreeItem extends DataSourceTreeItem {
	private dataSource: SqlConnectionDataSource;

	constructor(dataSource: SqlConnectionDataSource, dataSourcesNode: DataSourcesTreeItem) {
		super(vscode.Uri.file(path.join(dataSourcesNode.uri.path, dataSource.name)), dataSourcesNode);
		this.dataSource = dataSource;
	}

	public get treeItem(): vscode.TreeItem {
		let item = new vscode.TreeItem(this.uri, vscode.TreeItemCollapsibleState.Collapsed);
		item.label = `${this.dataSource.name} (${this.dataSource.friendlyName})`;

		return item;
	}

	public get children(): BaseProjectTreeItem[] {
		const result: MessageTreeItem[] = [];

		for (const comp of Object.keys(this.dataSource.connectionStringComponents).sort()) {
			result.push(new MessageTreeItem(`${comp}: ${this.dataSource.connectionStringComponents[comp]}`, this));
		}

		return result;
	}
}

export function constructDataSourceTreeItem(dataSource: DataSource, dataSourcesNode: DataSourcesTreeItem): DataSourceTreeItem {
	switch (dataSource.type) {
		case SqlConnectionDataSource.type:
			return new SqlConnectionDataSourceTreeItem(dataSource as SqlConnectionDataSource, dataSourcesNode);
		default:
			throw new Error(constants.unknownDataSourceType + dataSource.type);
	}
}
