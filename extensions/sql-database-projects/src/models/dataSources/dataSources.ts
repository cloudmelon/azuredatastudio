/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { promises as fs } from 'fs';
import * as constants from '../../common/constants';
import { SqlConnectionDataSource } from './sqlConnectionStringSource';

export abstract class DataSource {
	public name: string;
	public abstract get type(): string;
	public abstract get friendlyName(): string;

	constructor(name: string) {
		this.name = name;
	}
}

export async function load(dataSourcesFilePath: string): Promise<DataSource[]> {
	let fileContents;

	try {
		fileContents = await fs.readFile(dataSourcesFilePath);
	}
	catch (err) {
		throw new Error(constants.noDataSourcesFile);
	}

	const rawJsonContents = JSON.parse(fileContents.toString());

	if (rawJsonContents.version === undefined) {
		throw new Error(constants.missingVersion);
	}

	const output: DataSource[] = [];

	// TODO: do we have a construct for parsing version numbers?
	switch (rawJsonContents.version) {
		case '0.0.0':
			const dataSources: DataSourceFileJson = rawJsonContents as DataSourceFileJson;

			for (const source of dataSources.datasources) {
				output.push(createDataSource(source));
			}

			break;
		default:
			throw new Error(constants.unrecognizedDataSourcesVersion + rawJsonContents.version);
	}

	return output;
}

function createDataSource(json: DataSourceJson): DataSource {
	switch (json.type) {
		case SqlConnectionDataSource.type:
			return SqlConnectionDataSource.fromJson(json);
		default:
			throw new Error(constants.unknownDataSourceType + json.type);
	}
}
