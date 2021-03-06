---
layout: layout.pug
navigationTitle:  Converting Agent Node Types
title: Converting Agent Node Types
menuWeight: 700
excerpt:

enterprise: false
---

<!-- This source repo for this topic is https://github.com/dcos/dcos-docs -->


You can convert agent nodes to public or private for an existing DC/OS cluster.

Agent nodes are designated as [public](/mesosphere/dcos/1.10/overview/concepts/#public-agent-node) or [private](/mesosphere/dcos/1.10/overview/concepts/#private-agent-node) during installation. By default, they are designated as private during [GUI][1] or [CLI][2] installation.

### Prerequisites:
The following steps must be performed on a machine that is configured as a DC/OS node. Any tasks that are running on the node will be terminated during this conversion process.

*   DC/OS is installed using the [custom](/mesosphere/dcos/1.10/installing/) installation method and you have deployed at least one [master](/mesosphere/dcos/1.10/overview/concepts/#master) and one [private](/mesosphere/dcos/1.10/overview/concepts/#private-agent-node) agent node.
*   The archived DC/OS installer file (`dcos-install.tar`) from your [installation](/mesosphere/dcos/1.10/installing/#backup).
*   The CLI JSON processor [jq](https://github.com/stedolan/jq/wiki/Installation).
*   SSH installed and configured. This is required for accessing nodes in the DC/OS cluster.

**Note:** Use the following steps to convert your agent node only. You will not be able to actually uninstall DC/OS here. In order to uninstall DC/OS, currently you must [re-image](/mesosphere/dcos/1.10/installing/production/uninstalling/index.md) the operating system on your nodes. The uninstalling process may change in future releases of DC/OS.

### Determine the node type
You can determine the node type by running the following commands from the DC/OS CLI.

-   Run this command to determine how many private agents are there in the cluster. A result of `0` indicates that there are no private agents.

    ```bash
    dcos node --json | jq --raw-output '.[] | select(.reserved_resources.slave_public == null) | .id' | wc -l
    ```

-   Run this command to determine how many public agents are there in the cluster. A result of `0` indicates that there are no public agents.

    ```bash
    dcos node --json | jq --raw-output '.[] | select(.reserved_resources.slave_public != null) | .id' | wc -l
    ```


### Disable DC/OS private agent software

1.  Disable DC/OS on the agent node.

    ```bash
    sudo /opt/mesosphere/bin/dcos-shell
    sudo -i pkgpanda uninstall
    sudo systemctl stop dcos-mesos-slave
    sudo systemctl disable dcos-mesos-slave
    ```

2.  Remove the old directory structures on the agent node.

    ```bash
    sudo rm -rf /etc/mesosphere /opt/mesosphere /var/lib/mesos /var/lib/dcos
    ```

3.  Restart the machine.

    ```bash
    sudo reboot
    ```

### Install DC/OS and convert agent node
Copy the archived DC/OS installer file (`dcos-install.tar`) to the node that is being converted. This archive is created during the GUI or CLI [installation](/mesosphere/dcos/1.10/installing/#backup) method.

1.  Copy the files to your agent node. For example, you can use Secure Copy (scp) to copy `dcos-install.tar` to your home directory.

    ```bash
    scp ~/dcos-install.tar $username@$node-ip:~/dcos-install.tar
    ```

2.  SSH to the machine.

    ```bash
    ssh $USER@$AGENT
    ```

1.  Create a directory for the installer files.

     ```bash
     sudo mkdir -p /opt/dcos_install_tmp
     ```

1.  Unpackage the `dcos-install.tar` file.

    ```bash
    sudo tar xf dcos-install.tar -C /opt/dcos_install_tmp
    ```

1.  Run this command to install DC/OS on your agent nodes. You must designate your agent nodes as public or private.

    Private agent nodes.

    ```bash
    sudo bash /opt/dcos_install_tmp/dcos_install.sh slave
    ```

    Public agent nodes.

    ```bash
    sudo bash /opt/dcos_install_tmp/dcos_install.sh slave_public
    ```

 [1]: /mesosphere/dcos/1.10/installing/
 [2]: /mesosphere/dcos/1.10/installing/evaluation/
