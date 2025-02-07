## API Report File for "@fluidframework/map"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import type { IChannelAttributes } from '@fluidframework/datastore-definitions';
import type { IChannelFactory } from '@fluidframework/datastore-definitions';
import type { IChannelServices } from '@fluidframework/datastore-definitions';
import { IDisposable } from '@fluidframework/core-interfaces';
import { IEvent } from '@fluidframework/core-interfaces';
import { IEventProvider } from '@fluidframework/core-interfaces';
import { IEventThisPlaceHolder } from '@fluidframework/core-interfaces';
import type { IFluidDataStoreRuntime } from '@fluidframework/datastore-definitions';
import { ISharedObject } from '@fluidframework/shared-object-base';
import { ISharedObjectEvents } from '@fluidframework/shared-object-base';
import type { ISharedObjectKind } from '@fluidframework/shared-object-base';

// @alpha @sealed
export class DirectoryFactory implements IChannelFactory<ISharedDirectory> {
    static readonly Attributes: IChannelAttributes;
    get attributes(): IChannelAttributes;
    create(runtime: IFluidDataStoreRuntime, id: string): ISharedDirectory;
    load(runtime: IFluidDataStoreRuntime, id: string, services: IChannelServices, attributes: IChannelAttributes): Promise<ISharedDirectory>;
    static readonly Type = "https://graph.microsoft.com/types/directory";
    get type(): string;
}

// @alpha
export interface IDirectory extends Map<string, any>, IEventProvider<IDirectoryEvents>, Partial<IDisposable> {
    readonly absolutePath: string;
    countSubDirectory?(): number;
    createSubDirectory(subdirName: string): IDirectory;
    deleteSubDirectory(subdirName: string): boolean;
    get<T = any>(key: string): T | undefined;
    getSubDirectory(subdirName: string): IDirectory | undefined;
    getWorkingDirectory(relativePath: string): IDirectory | undefined;
    hasSubDirectory(subdirName: string): boolean;
    set<T = unknown>(key: string, value: T): this;
    subdirectories(): IterableIterator<[string, IDirectory]>;
}

// @alpha
export interface IDirectoryEvents extends IEvent {
    (event: "containedValueChanged", listener: (changed: IValueChanged, local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "subDirectoryCreated", listener: (path: string, local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "subDirectoryDeleted", listener: (path: string, local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "disposed", listener: (target: IEventThisPlaceHolder) => void): any;
    (event: "undisposed", listener: (target: IEventThisPlaceHolder) => void): any;
}

// @alpha
export interface IDirectoryValueChanged extends IValueChanged {
    path: string;
}

// @alpha
export interface ISharedDirectory extends ISharedObject<ISharedDirectoryEvents & IDirectoryEvents>, Omit<IDirectory, "on" | "once" | "off"> {
    // (undocumented)
    [Symbol.iterator](): IterableIterator<[string, any]>;
    // (undocumented)
    readonly [Symbol.toStringTag]: string;
}

// @alpha
export interface ISharedDirectoryEvents extends ISharedObjectEvents {
    (event: "valueChanged", listener: (changed: IDirectoryValueChanged, local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "clear", listener: (local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "subDirectoryCreated", listener: (path: string, local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "subDirectoryDeleted", listener: (path: string, local: boolean, target: IEventThisPlaceHolder) => void): any;
}

// @public @sealed
export interface ISharedMap extends ISharedObject<ISharedMapEvents>, Map<string, any> {
    get<T = any>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T): this;
}

// @public @sealed
export interface ISharedMapEvents extends ISharedObjectEvents {
    (event: "valueChanged", listener: (changed: IValueChanged, local: boolean, target: IEventThisPlaceHolder) => void): any;
    (event: "clear", listener: (local: boolean, target: IEventThisPlaceHolder) => void): any;
}

// @public @sealed
export interface IValueChanged {
    readonly key: string;
    readonly previousValue: any;
}

// @alpha @sealed
export class MapFactory implements IChannelFactory<ISharedMap> {
    static readonly Attributes: IChannelAttributes;
    get attributes(): IChannelAttributes;
    create(runtime: IFluidDataStoreRuntime, id: string): ISharedMap;
    load(runtime: IFluidDataStoreRuntime, id: string, services: IChannelServices, attributes: IChannelAttributes): Promise<ISharedMap>;
    static readonly Type = "https://graph.microsoft.com/types/map";
    get type(): string;
}

// @alpha @sealed
export const SharedDirectory: ISharedObjectKind<ISharedDirectory>;

// @alpha @deprecated
export type SharedDirectory = ISharedDirectory;

// @public @deprecated
export const SharedMap: ISharedObjectKind<ISharedMap>;

// @public @deprecated
export type SharedMap = ISharedMap;

```
