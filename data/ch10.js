window.HLW.chapters.push({
  id: 10,
  title: 'Network Applications and Services',
  short: 'Network services',
  track: 'network',
  ref: 'Chapter 10',
  sectionsRef: '10.1–10.10',
  minutes: 45,
  tagline: 'From a listening socket to a trusted remote session.',
  blurb: 'Learn how network services are structured, operate and secure SSH, diagnose traffic with tcpdump and netcat, and understand sockets and RPC.',
  objectives: [
    'Explain how a daemon listens, accepts and serves network connections.',
    'Configure and use SSH securely: host keys, user keys, agents and tunnels.',
    'Capture and inspect traffic with tcpdump, netcat, lsof and port scanners.',
    'Describe RPC, Unix domain sockets and the service attack surface.',
    'Apply practical network hardening: least privilege, patching, key auth and fail2ban.'
  ],
  sections: [
    {
      id: 'ch10-services',
      ref: '10.1–10.4',
      title: 'How network services work',
      html: `<p>A network service is a process that listens on a socket and responds to connections. It may be a long-running <strong>daemon</strong> started by systemd, or a service activated on demand. The classic inetd model started a handler for each connection; systemd's <code>.socket</code> units modernise that idea.</p>
      <pre><code>$ ss -tlnp
$ systemctl list-units --type=socket
$ systemctl status ssh.socket
$ systemctl cat ssh.service</code></pre>
      <p>The daemon binds an address and port, then calls <code>listen()</code> and <code>accept()</code>. It may fork or spawn threads per connection, or use an event loop. Privileged ports require root or a capability, so many designs put a small privileged listener in front of an unprivileged worker — or use a reverse proxy.</p>
      <p><strong>inetd/xinetd</strong> are largely historical: a super-server listened on many ports and launched the right program per connection. They are simple but add process overhead and weak isolation. Native systemd socket activation provides similar on-demand behaviour with better logging and dependency management.</p>
      <p>A service should run as a dedicated user, with the minimum filesystem access it needs, and log to the journal or a dedicated file. <code>systemctl status</code> plus <code>journalctl -u</code> is the first diagnostic pair for any service.</p>`
    },
    {
      id: 'ch10-ssh',
      ref: '10.3',
      title: 'SSH: server, client and keys',
      html: `<p><strong>OpenSSH</strong> is the standard remote shell and file-transfer tool. The server (<code>sshd</code>) listens on TCP 22, authenticates the client, and provides an encrypted channel. The client verifies the server's <strong>host key</strong> against <code>~/.ssh/known_hosts</code>; a changed host key is a loud warning that should never be ignored without investigation.</p>
      <pre><code>$ sudo systemctl status sshd        # or ssh.service on Debian
$ sudo sshd -t                      # validate configuration
$ ssh user@host
$ ssh -v user@host                  # verbose handshake diagnostics
$ ssh-keygen -t ed25519 -C "laptop"
$ ssh-copy-id user@host</code></pre>
      <p>Key authentication replaces passwords. The private key stays on the client, protected by a passphrase; the public key goes in <code>~/.ssh/authorized_keys</code> on the server. Permissions matter: <code>~/.ssh</code> should be 700 and <code>authorized_keys</code> 600, or sshd may refuse the key. Use an agent (<code>ssh-agent</code>) to avoid retyping the passphrase; be cautious with agent forwarding.</p>
      <p>Server hardening in <code>/etc/ssh/sshd_config</code> and <code>/etc/ssh/sshd_config.d/</code>:</p>
      <pre><code>PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers alice bob
X11Forwarding no
MaxAuthTries 3</code></pre>
      <p>After editing, run <code>sshd -t</code> and restart. Keep an existing session open while testing a new configuration so a mistake does not lock you out. <strong>fail2ban</strong> watches logs for repeated failures and temporarily bans source addresses with firewall rules; it complements, but does not replace, key-only authentication.</p>`
    },
    {
      id: 'ch10-tunnels',
      ref: '10.3.4',
      title: 'Tunnels and file transfer over SSH',
      html: `<p>SSH can forward ports, creating encrypted tunnels through a remote host. <strong>Local forwarding</strong> exposes a remote service on a local port; <strong>remote forwarding</strong> exposes a local service on the remote host; <strong>dynamic forwarding</strong> creates a SOCKS proxy.</p>
      <pre><code>ssh -L 8080:db.internal:5432 user@bastion   # local 8080 → remote db:5432
ssh -R 9000:localhost:3000 user@public      # public 9000 → your 3000
ssh -D 1080 user@bastion                    # SOCKS proxy on 1080
ssh -N -f -L 8080:localhost:80 user@host    # background, no shell</code></pre>
      <p>Tunnels are useful for reaching databases or admin interfaces that should not be exposed publicly. Bind local forwards to <code>127.0.0.1</code> unless you intentionally want other machines to use them; the default may listen on all interfaces depending on configuration.</p>
      <p><strong>scp</strong> copies files over SSH; <strong>sftp</strong> provides an interactive file-transfer session; <strong>rsync -e ssh</strong> adds efficient incremental transfer (Chapter 12). All three authenticate with the same SSH keys and honour <code>~/.ssh/config</code> host aliases.</p>
      <pre><code>scp report.pdf user@host:/tmp/
sftp user@host
rsync -avz -e ssh ./site/ user@host:/var/www/site/</code></pre>
      <p>Disable unused forwarding features on servers that do not need them (<code>AllowTcpForwarding no</code>, <code>X11Forwarding no</code>, <code>PermitTunnel no</code>) to reduce the attack surface.</p>`
    },
    {
      id: 'ch10-diagnostics',
      ref: '10.5',
      title: 'Diagnostic tools',
      html: `<p><strong>lsof -i</strong> maps sockets to processes. <strong>ss</strong> gives a socket-level view. <strong>tcpdump</strong> captures packets. <strong>netcat</strong> reads and writes raw TCP/UDP. <strong>nmap</strong> scans ports. Together they answer “who is listening, what is sent, and what answers?”.</p>
      <pre><code>$ sudo lsof -i :22
$ ss -tlnp
$ sudo tcpdump -i any -n port 53
$ sudo tcpdump -i eth0 -w capture.pcap
$ sudo tcpdump -r capture.pcap -nn
$ nc -l 12345
$ nc -zv host 20-25
$ nmap -sT -p 1-1024 host</code></pre>
      <p><code>tcpdump</code> filters use BPF syntax: <code>host 10.0.0.5</code>, <code>port 443</code>, <code>tcp[tcpflags] &amp; tcp-syn != 0</code>. Write to a pcap and analyse in Wireshark when possible. Captures may contain credentials and personal data; treat them as sensitive and delete them when done.</p>
      <p><code>netcat</code> is a Swiss-army knife: a listener, a client, a port scanner, a file pipe. The <code>-z</code> zero-I/O scan and <code>-v</code> verbose flags are useful for checking reachability. Some variants (ncat, OpenBSD nc) differ in flags; check <code>nc -h</code>.</p>
      <p>Port scanning a system you do not own may be illegal or against policy. Scan your own hosts, or systems for which you have explicit written authorisation.</p>`,
      callout: {
        type: 'warn',
        title: 'Capture only what you need',
        text: 'Run tcpdump with a narrow filter, a packet count (-c) and a time limit. Full-interface captures on a busy server can fill a disk in minutes and expose sensitive payloads.'
      }
    },
    {
      id: 'ch10-rpc',
      ref: '10.6, 10.9–10.10',
      title: 'RPC and sockets',
      html: `<p><strong>Remote Procedure Call</strong> lets a program invoke a procedure on another machine as if it were local. Sun RPC underpins NFS and NIS. The <strong>portmapper</strong> (rpcbind, TCP/UDP 111) maps RPC program numbers to dynamically chosen ports. Firewalling RPC services therefore requires either fixed ports or tracking the portmapper.</p>
      <pre><code>$ rpcinfo -p host
$ ss -tlnp | grep 111</code></pre>
      <p>A <strong>socket</strong> is the kernel object behind every network connection. The application calls <code>socket()</code>, <code>bind()</code>, <code>listen()</code>, <code>accept()</code> for servers, or <code>connect()</code> for clients, then reads and writes file descriptors. The same API supports <strong>Unix domain sockets</strong> (<code>AF_UNIX</code>), which are local, efficient and filesystem-addressable — used by databases, container runtimes and systemd.</p>
      <pre><code>$ ss -xl                 # listening Unix domain sockets
$ lsof -U                # open Unix sockets
$ ls -l /run/            # many service sockets live here</code></pre>
      <p>Unix sockets can carry file-descriptor passing and peer credentials, which is why they are preferred for local privileged communication. Network sockets carry IP addresses and ports and must be protected by TLS or SSH when crossing untrusted networks.</p>`
    },
    {
      id: 'ch10-security',
      ref: '10.7–10.8',
      title: 'Network security essentials',
      html: `<p>Most compromises exploit known, fixable weaknesses: unpatched software, weak or reused passwords, exposed admin interfaces, misconfigured permissions, and services that should never have been public. Security is a process of reducing exposure and detecting failure.</p>
      <ul>
        <li><strong>Patch.</strong> Keep the OS and network-facing services current; reboot when a kernel or library update requires it.</li>
        <li><strong>Minimise.</strong> Disable unused services, close unused ports, bind admin interfaces to localhost or a VPN.</li>
        <li><strong>Authenticate strongly.</strong> Prefer keys or certificates over passwords; require MFA where possible; disable root login over SSH.</li>
        <li><strong>Encrypt.</strong> Use TLS for application traffic and SSH for remote administration. Never send credentials over plaintext protocols such as telnet or FTP.</li>
        <li><strong>Isolate.</strong> Run services as dedicated users, use containers or namespaces, and apply firewall rules between zones.</li>
        <li><strong>Monitor.</strong> Centralise logs, alert on authentication failures and unexpected listeners, and review what changed.</li>
      </ul>
      <p><strong>TLS</strong> provides confidentiality, integrity and server authentication through certificates. It does not protect against a compromised server or a misconfigured client that ignores certificate errors. Pin or verify certificates where appropriate, and keep the trust store current.</p>
      <p><strong>fail2ban</strong> is a detection-and-response tool: it parses logs, matches failure patterns, and adds temporary firewall bans. Tune its thresholds to avoid banning legitimate users, and make sure your own management address is protected. It is not a substitute for fixing the underlying authentication weakness.</p>`
    }
  ],
  commands: [
    { cmd: 'ss -tlnp', desc: 'List listening TCP sockets with owning processes.' },
    { cmd: 'lsof -i :22', desc: 'Show which process is using a specific port.' },
    { cmd: 'sudo systemctl status sshd', desc: 'Check the SSH server unit state and recent log lines.' },
    { cmd: 'sudo sshd -t', desc: 'Validate the sshd configuration without restarting.' },
    { cmd: 'ssh-keygen -t ed25519 -C "label"', desc: 'Generate an Ed25519 SSH key pair.' },
    { cmd: 'ssh-copy-id user@host', desc: 'Install your public key in the remote authorized_keys file.' },
    { cmd: 'ssh -L 8080:localhost:80 user@host', desc: 'Forward local port 8080 to port 80 on the remote host.' },
    { cmd: 'scp file user@host:/path/', desc: 'Copy a file over SSH.' },
    { cmd: 'sudo tcpdump -i any -n port 443 -c 20', desc: 'Capture 20 HTTPS packets without resolving names.' },
    { cmd: 'nc -l 12345', desc: 'Listen on TCP port 12345 for a raw connection.' },
    { cmd: 'nc -zv host 22', desc: 'Probe whether a TCP port is open, with verbose output.' },
    { cmd: 'nmap -sT -p 1-1024 host', desc: 'Scan TCP ports on a host you are authorised to test.' },
    { cmd: 'rpcinfo -p host', desc: 'List RPC programs and ports registered with the portmapper.' },
    { cmd: 'ss -xl', desc: 'List listening Unix domain sockets.' },
    { cmd: 'sudo fail2ban-client status sshd', desc: 'Show fail2ban bans and statistics for the SSH jail.' }
  ],
  labs: [
    {
      title: 'Inspect your SSH posture',
      goal: 'Read the server configuration and key permissions without changing them.',
      steps: [
        'Run <code>ss -tlnp | grep :22</code> and confirm sshd is listening.',
        'Run <code>sudo sshd -T | egrep "permitrootlogin|passwordauthentication|pubkeyauthentication"</code> to see the effective settings.',
        'Inspect <code>/etc/ssh/sshd_config</code> and any files in <code>/etc/ssh/sshd_config.d/</code>. Which setting wins?',
        'Run <code>ls -ld ~/.ssh</code> and <code>ls -l ~/.ssh/authorized_keys</code> if present. Are permissions 700/600?',
        'Run <code>ssh-keygen -lf ~/.ssh/id_ed25519.pub</code> to display your key fingerprint, or generate a test key in a temporary directory.'
      ]
    },
    {
      title: 'Watch a loopback conversation',
      goal: 'See TCP and a socket in action using only local traffic.',
      steps: [
        'In one terminal, run <code>nc -l 12345</code>. In another, run <code>ss -tlnp | grep 12345</code>.',
        'Connect with <code>nc 127.0.0.1 12345</code>, type a line and observe it on the listener. Press Ctrl-C to finish.',
        'Start <code>sudo tcpdump -i lo -n port 12345 -c 10</code>, repeat a short connection, and identify SYN, ACK and data packets.',
        'Run <code>ss -tan</code> during the connection and locate the local/remote address pair.',
        'Stop tcpdump and explain why the loopback traffic never reaches your physical interface.'
      ]
    }
  ],
  cards: [
    { front: 'How does the client verify an SSH server?', back: 'It checks the server host key against ~/.ssh/known_hosts. A changed key triggers a warning about a possible man-in-the-middle attack.' },
    { front: 'What permissions should ~/.ssh and authorized_keys have?', back: '~/.ssh 700 (owner only) and authorized_keys 600. Loose permissions can make sshd ignore the key.' },
    { front: 'What does ssh -L 8080:db:5432 user@bastion do?', back: 'Listens on local port 8080 and forwards through the SSH connection to db:5432 as seen from the bastion.' },
    { front: 'What does tcpdump -i any -n port 53 show?', back: 'DNS traffic on all interfaces, with numeric addresses and ports instead of names.' },
    { front: 'What is an RPC portmapper?', back: 'rpcbind on port 111 maps RPC program numbers to the dynamically assigned ports where those services listen.' },
    { front: 'Network socket vs Unix domain socket', back: 'Network sockets use IP addresses and ports (AF_INET/AF_INET6). Unix sockets use a local filesystem path or abstract namespace (AF_UNIX) and are faster and local-only.' },
    { front: 'What does fail2ban actually do?', back: 'It watches logs for failed authentication patterns and adds temporary firewall bans. It complements key-only auth and patching; it does not fix weak configuration.' }
  ],
  quiz: [
    {
      q: 'What is the safest authentication setting for a public SSH server?',
      options: [
        'PermitRootLogin yes with a strong password',
        'PasswordAuthentication yes for convenience',
        'PubkeyAuthentication yes with PasswordAuthentication no and root login disabled',
        'Telnet on a non-standard port'
      ],
      answer: 2,
      explain: 'Key-based authentication resists password guessing. Disabling root login and password auth removes the most common brute-force paths.'
    },
    {
      q: 'Which command validates sshd configuration before a restart?',
      options: ['sshd -t', 'ssh -t', 'systemctl reload', 'ssh-keygen -t'],
      answer: 0,
      explain: 'sshd -t tests the configuration syntax and key files. Always run it before restarting so a typo does not lock you out.'
    },
    {
      q: 'What does a local SSH forward (-L) do?',
      options: [
        'Forwards a local port through the SSH server to a destination reachable from the server.',
        'Opens a remote shell.',
        'Copies files automatically.',
        'Disables host-key checking.'
      ],
      answer: 0,
      explain: 'The client listens locally and tunnels connections over SSH; the server connects to the target address on its side.'
    },
    {
      q: 'Which tool captures packets for later analysis?',
      options: ['ss', 'tcpdump -w capture.pcap', 'lsof', 'nmcli'],
      answer: 1,
      explain: 'tcpdump -w writes raw packets to a pcap file, which can be reopened with tcpdump -r or analysed in Wireshark.'
    },
    {
      q: 'Why are Unix domain sockets preferred for local services?',
      options: [
        'They are routable across the internet.',
        'They avoid the network stack, use filesystem permissions, and can pass credentials/file descriptors.',
        'They provide encryption by default.',
        'They do not require a server process.'
      ],
      answer: 1,
      explain: 'AF_UNIX sockets are local and efficient, and the kernel can verify peer credentials and pass file descriptors. They are not routable over IP.'
    }
  ]
});
