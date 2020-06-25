---
layout: layout.pug
navigationTitle: Release Notes
title: Release Notes
menuWeight: 10
excerpt: Release notes for DC/OS Kubernetes version 2.6.0-1.17.7
---

<!-- This source repo for this topic is https://github.com/mesosphere/dcos-kubernetes-cluster -->

# Version 2.6.0-1.17.7

## Breaking Changes from 1.x

* DC/OS Kubernetes `2.6.0-1.17.7` requires DC/OS 1.12 or higher.
* DC/OS Kubernetes `2.6.0-1.17.7` introduces breaking changes to the way the package works and is deployed.
  Therefore, it is not possible to upgrade an existing installation of DC/OS Kubernetes 1.x to `2.6.0-1.17.7`.
* Before installing `kubernetes-cluster` package `2.6.0-1.17.7`, the `kubernetes` package must be [installed and running](/mesosphere/dcos/services/kubernetes/2.6.0-1.17.7/getting-started/installing-mke/).
* Now, when installing DC/OS Kubernetes on DC/OS Enterprise, you must specify a [service account](mesosphere/dcos/1.12/security/ent/service-auth/) and a service account secret with adequate [permissions](mesosphere/dcos/1.12/security/ent/perms-reference/).
* Package options have been renamed and re-organized.
  * `node_placement` renamed to `private_node_placement`
  * `reserved_resources` renamed to `private_reserved_resources`
  * `control_plane_reserved_resources` contains the combined resources from previous `1.x` options `apiserver`, `controller_manager` and `scheduler` and `2.0.0-1.12.0-beta` options `control_plane_cpus`, `control_plane_mem` and `control_plane_disk` were moved to under this group.

## Improvements

* Kubernetes 1.17.7
* Docker 19.03.8
* etcd 3.3.22
* Calico 3.14.1
* Velero 1.4.0
* CoreDNS 1.7.0
* Update Debian base container images to version stable-20200607-slim

## Bug Fixes

## Documentation

## Known Issues

Known issues and limitations are listed in the [Limitations](/mesosphere/dcos/services/kubernetes/2.6.0-1.17.7/limitations/) page.

## Changelog

See [Changelog](/mesosphere/dcos/services/kubernetes/2.6.0-1.17.7/changelog) for a list of all changes.