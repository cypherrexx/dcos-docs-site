---
layout: layout.pug
navigationTitle: Accessing the cluster
title: Accessing the cluster
menuWeight: 1
excerpt: Access the Konvoy cluster using the operations portal, command line interface, or kubectl
beta: true
enterprise: false
---

## Using the operations portal

When Konvoy completes the provisioning of the cluster, it provides the access details of the cluster's operations portal.

```text
Kubernetes cluster and addons deployed successfully!

Run `konvoy apply kubeconfig` to update kubectl credentials.

Run `konvoy check` to verify that the cluster has reached a steady state and all deployments have finished.

Navigate to the URL below to access various services running in the cluster.
  https://lb_addr-12345.us-west-2.elb.amazonaws.com/ops/landing
And login using the credentials below.
  Username: AUTO_GENERATED_USERNAME
  Password: SOME_AUTO_GENERATED_PASSWORD_12345

If the cluster was recently created, the dashboard and services may take a few minutes to be accessible.
```

This can also be retrieved after the cluster is deployed, with the following command, provided you have an administraive `admin.conf` KUBECONFIG file:

```bash
konvoy get ops-portal
```

The URL provided in these details offers access to the **operations portal**, a web UI which links to various dashboards of the tooling integrated on Konvoy Kubernetes clusters.
This UI is hosted on a web application within the cluster, which runs on the cluster's ingress load balancer.

To access the UI:

1. Enter that URL in your browser.
2. Click the "Launch Console" button
3. Enter your username and password as noted above, and click "Login".

You should then see Konvoy's operations portal. The portal provides an overview of cluster status, and shortcuts to several dashboards to addon services, such as Grafana.

<p class="message--important"><strong>IMPORTANT: </strong>When using an automated provisioner, do not delete the load balancer created by the cloud provider for the traefik service. <br>
If the load balancer is deleted, follow the steps below to regain access to the ops-portal. In order to complete the instructions below, you must update your kubectl credentials with the `<code>admin.conf</code> file, created for your Konvoy cluster, by running the <code>./konvoy apply kubeconfig</code> command. More on that <a href="#configure-kubectl-for-cluster-administrators">here.</a></p>

1.  Recreate the `Service` resource for `traefik-kubeaddons` in the `kubeaddons` namespace.

    ```bash
    kubectl get service -n kubeaddons traefik-kubeaddons -o json | jq 'del(.status)' | kubectl apply -f -
    ```

    If you do not have `jq`, save the output of `kubectl get service` to a file, remove the `status:` value, and `kubectl apply -f` the file.If you do not have `jq`, save the output of `kubectl get service` to a file, remove the `status:` value, and `kubectl apply -f` the file.

1.  Delete the `traefik` pods and let Kubernetes recreate them, this will cause a few other pods to restart with the new configuration.

    ```bash
    kubectl delete pods -n kubeaddons -l release=traefik-kubeaddons
    ```

1.  Retrieve the new address.

    ```bash
    konvoy get ops-portal
    ```

## Using kubectl

One of the most common ways to perform administrative tasks and interact with a Kubernetes cluster is through the `kubectl` command line interface.
With `kubectl`, you can run commands against native Kubernetes clusters to retrieve information about key cluster activities and to control specific cluster-level components and operations.

For example, you can use `kubectl` to:

- Deploy applications
- Manage cluster resources
- View logs and status messages

For a complete list of `kubectl` operations, see [overview of kubectl][kubectl_overview].

### Install kubectl

The specific steps required for installing kubectl depend on your operating system platform.
For platform-specific instructions to help you install kubectl, see the appropriate Kubernetes [installation and setup information][install_kubectl] for the platform you use.

### Configure kubectl (for cluster administrators)

The `kubectl` program uses information in its configuration file to customize operations for a specific cluster.
By default, the configuration file for `kubectl` is named `config` and is located in the `$HOME/.kube` directory.
You can specify other `kubeconfig` files by setting the `KUBECONFIG` environment variable or by setting the `--kubeconfig` flag.

After you create a cluster with the `konvoy up` command, the simplest way to add that cluster's `kubectl` configuration to either the default  `~/.kube/config` file or to the file you have specified using the `KUBECONFIG` environment variable is to run the following `konvoy` command:

```bash
konvoy apply kubeconfig
```

The `konvoy apply kubeconfig` command applies the contents of the local Konvoy `admin.conf` configuration file to your existing default configuration.

### Configure kubectl (for authorized users)

This section illustrates how non-administrative users could access the cluster's API, using `kubectl` with credentials derived from their third-party single sign-on environment.

1. Enter the URL of the operations portal in your browser, as noted in [Using the operations portal][ops_portal].
2. Click the "Generate kubectl token" button.
3. Select the appropriate Kubernetes cluster authenticator (usually shown as `Kubernetes cluster`).
4. Log in using your username and password, or using a third-party integrated sign-on.
5. Follow instructions and execute commands in your terminal, as directed on the page.

<p class="message--note"><strong>NOTE: </strong>By default, new users who log in this way will <strong>not</strong> have permissions on the cluster's API. </p>

Your cluster administrator must grant you permissions on the cluster, through a Kubernetes [role-binding][role_binding].

An unprivileged user will receive errors like the following via `kubectl`:

```text
Error from server (Forbidden): nodes is forbidden: User "${USERNAME}" cannot list resource "nodes" in API group "" at the cluster scope
```

Supposing your user should have administrative permissions, the following command will grant them full cluster administration:

```bash
kubectl create clusterrolebinding rb_admin_${USERNAME} --clusterrole=cluster-admin --user=${USERNAME}
```

### Create an administrative service account

While service accounts typically provide API access to applications running on the cluster, they can also provide access to users or services outside of the cluster. A service account does not require credentials derived from a third-party single sign-on environment. A cluster administrator must be able to access the cluster even when a third-party single sign-on environment is unavailable; this makes the service account a good choice for sharing administrative access.

To create an administrative service account, [configure kubectl for a cluster administrator][configure_kubectl]. Then, run the following commands:

```bash
konvoy generate cluster-admin-serviceaccount ${SERVICEACCOUNT_NAME} | kubectl apply -f-
```

To use the service account to access the API, view the kubeconfig for the service account, then give the kubeconfig to a user or application.

```bash
konvoy view serviceaccount-kubeconfig --namespace kube-system ${SERVICEACCOUNT_NAME}
```

### Common kubectl command examples

The following highlights several important commands that are particularly relevant for working with **Konvoy** clusters.
For information about other commands that are generally useful, see [the kubectl cheatsheet][kubectl_cheatsheet].

#### Viewing addons and system pods

Konvoy clusters come with a series of addons deployed.
These addons live in one of three namespaces:

- `kube-system`: Core Kubernetes components, and a limited set of addons that require administrative access to the cluster deploy here
- `velero`: Velero (used for cluster backup and restore) and its components are deployed here
- `kubeaddons`: Most addons will be deployed here unless otherwise specified

For a basic status check of all the addon and system-related pods, run the following commands:

```bash
kubectl -n kube-system get pods
kubectl -n velero get pods
kubectl -n kubeaddons get pods
```

[configure_kubectl]: #configure-kubectl-for-cluster-administrators
[install_kubectl]:https://kubernetes.io/docs/tasks/tools/install-kubectl/
[kubectl_cheatsheet]:https://kubernetes.io/docs/reference/kubectl/cheatsheet/
[kubectl_overview]: https://kubernetes.io/docs/reference/kubectl/overview/
[ops_portal]: #using-the-operations-portal
[role_binding]: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#rolebinding-and-clusterrolebinding
