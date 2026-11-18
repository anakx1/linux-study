window.HLW.chapters.push({
  id: 9,
  title: 'Understanding Your Network and Its Configuration',
  short: 'Networking',
  track: 'network',
  ref: 'Chapter 9',
  sectionsRef: '9.1–9.28',
  minutes: 60,
  tagline: 'Packets, prefixes, routes, names and the firewall in between.',
  blurb: 'Build a working model of Linux networking: encapsulation, IP addressing and subnets, routing, interfaces, DNS, ports, DHCP, NAT and firewalls.',
  objectives: [
    'Explain packet encapsulation across the link, internet and transport layers.',
    'Read IPv4/IPv6 addresses and CIDR prefixes, and identify network versus host bits.',
    'Inspect and change interfaces and routes with ip and NetworkManager.',
    'Diagnose name resolution through hosts, resolv.conf and nsswitch.conf.',
    'Understand TCP/UDP ports, DHCP, NAT, routing between networks, and firewall policy.'
  ],
  sections: [
    {
      id: 'ch9-layers',
      ref: '9.1–9.3',
      title: 'Packets and network layers',
      html: `<p>Networking is layered encapsulation. An application writes data; TCP or UDP wraps it in a segment/datagram with ports; IP wraps that in a packet with source and destination addresses; Ethernet wraps the packet in a frame with MAC addresses. Each layer adds a header and passes the result down. The receiver strips headers in reverse.</p>
      <pre><code>application data
  └─ TCP/UDP header   (ports, sequence, checksum)
      └─ IP header    (source/destination IP, TTL, protocol)
          └─ Ethernet frame (source/destination MAC, EtherType)
              └─ bits on the wire</code></pre>
      <p>The <strong>link layer</strong> moves frames on a local network. The <strong>internet layer</strong> (IP) routes packets between networks. The <strong>transport layer</strong> (TCP/UDP) identifies processes via ports and provides reliability or datagram semantics. The application layer is everything above that: HTTP, DNS, SSH, SMTP.</p>
      <p>Routers forward packets between IP networks and decrement the TTL. Switches forward frames within a LAN using MAC addresses. A host decides whether a destination is local (send directly via ARP/NDP) or remote (send to its default gateway).</p>`,
      diagram: {
        type: 'layers',
        caption: 'Encapsulation: each layer wraps the one above',
        items: [
          { t: 'Application', d: 'HTTP · DNS · SSH · SMTP', cls: 'hot' },
          { t: 'Transport', d: 'TCP / UDP — ports and reliability' },
          { t: 'Internet', d: 'IP — addresses and routing', cls: 'warm' },
          { t: 'Link', d: 'Ethernet / Wi-Fi — MAC frames' },
          { t: 'Physical', d: 'cable, radio, optics' }
        ]
      }
    },
    {
      id: 'ch9-addressing',
      ref: '9.4',
      title: 'IP addresses, subnets and CIDR',
      html: `<p>An IPv4 address is 32 bits written as four decimal octets, such as <code>192.168.1.42</code>. A <strong>subnet mask</strong> or <strong>CIDR prefix</strong> says how many leading bits identify the network; the rest identify the host. <code>/24</code> means 24 network bits and 8 host bits.</p>
      <pre><code>192.168.1.42/24
network: 192.168.1.0
mask:    255.255.255.0
hosts:   192.168.1.1 – 192.168.1.254 (254 usable)
broadcast: 192.168.1.255</code></pre>
      <p>Common prefixes: <code>/8</code> (16.7M addresses), <code>/16</code> (65,536), <code>/24</code> (256), <code>/30</code> (4 addresses, 2 usable — point-to-point links). The network and broadcast addresses are not assignable in classic IPv4 subnets.</p>
      <p>Special ranges:</p>
      <ul>
        <li><code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code> — private, not routed on the public internet.</li>
        <li><code>127.0.0.0/8</code> — loopback; <code>127.0.0.1</code> is localhost.</li>
        <li><code>169.254.0.0/16</code> — link-local, often a sign DHCP failed.</li>
        <li><code>224.0.0.0/4</code> — multicast.</li>
      </ul>
      <p><strong>IPv6</strong> uses 128-bit addresses written in hexadecimal groups, with <code>::</code> collapsing zero runs. <code>::1</code> is loopback, <code>fe80::/10</code> is link-local, and global unicast is currently drawn from <code>2000::/3</code>. IPv6 has no broadcast; it uses multicast and NDP instead of ARP.</p>`
    },
    {
      id: 'ch9-routing',
      ref: '9.5–9.7',
      title: 'Routes and the default gateway',
      html: `<p>The kernel routing table maps destination prefixes to next hops and interfaces. It chooses the <strong>longest matching prefix</strong>. If no specific route matches, the <strong>default route</strong> (<code>0.0.0.0/0</code> for IPv4, <code>::/0</code> for IPv6) is used — normally pointing at the local router.</p>
      <pre><code>$ ip route
default via 192.168.1.1 dev wlan0 proto dhcp metric 600
192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.42
$ ip route get 1.1.1.1
$ ip -6 route
$ ip neigh</code></pre>
      <p><code>ip route get</code> is the quickest way to answer “which interface and source address will be used for this destination?”. <code>ip neigh</code> shows the ARP/NDP cache mapping IP addresses to link-layer addresses on the local segment.</p>
      <p>Multiple routes can exist with different <strong>metrics</strong>; lower metrics win when prefixes are equal. Policy routing (rules and multiple tables) allows more complex setups, such as sending traffic from one source address out a different interface.</p>
      <p>A host with two default routes can suffer asymmetric routing: packets leave one interface and return on another, confusing firewalls and TCP. Use metrics or policy rules deliberately.</p>`
    },
    {
      id: 'ch9-interfaces',
      ref: '9.10–9.14',
      title: 'Interfaces, manual configuration and NetworkManager',
      html: `<p>An <strong>interface</strong> is a network endpoint: <code>eth0</code>, <code>wlan0</code>, <code>lo</code>, a bridge, a VLAN, a bond or a tunnel. Each has a link state (up/down), an MTU, a MAC address and zero or more IP addresses.</p>
      <pre><code>$ ip link show
$ ip addr show
$ sudo ip link set eth0 up
$ sudo ip addr add 192.168.1.50/24 dev eth0
$ sudo ip route add default via 192.168.1.1
$ sudo ip addr del 192.168.1.50/24 dev eth0</code></pre>
      <p>Manual <code>ip</code> changes are immediate but not persistent across reboot. For a server with a static configuration, use the distribution's network configuration (systemd-networkd, ifupdown, NetworkManager) or a higher-level tool. Verify with <code>ip addr</code>, <code>ip route</code> and <code>ping</code>.</p>
      <p><strong>NetworkManager</strong> manages connections as profiles. <code>nmcli</code> is its command-line interface; <code>nmtui</code> is a text UI. Profiles are stored under <code>/etc/NetworkManager/system-connections/</code>. A device can be managed or unmanaged; a connection profile supplies addressing, DNS, Wi-Fi credentials and routes.</p>
      <pre><code>$ nmcli device status
$ nmcli connection show
$ nmcli connection up "Wired connection 1"
$ nmcli connection modify "Wired connection 1" ipv4.method manual \\
    ipv4.addresses 192.168.1.50/24 ipv4.gateway 192.168.1.1</code></pre>
      <p>Do not fight the manager by editing files it owns. Use its tooling, or mark the interface unmanaged if another system is responsible for it.</p>`
    },
    {
      id: 'ch9-dns',
      ref: '9.8, 9.15–9.16',
      title: 'Name resolution',
      html: `<p>Applications resolve names through the C library, which follows <code>/etc/nsswitch.conf</code>. The typical order is <code>files</code> then <code>dns</code>: check <code>/etc/hosts</code> first, then ask a DNS resolver.</p>
      <pre><code># /etc/nsswitch.conf
hosts: files mdns4_minimal [NOTFOUND=return] dns

# /etc/hosts
127.0.0.1   localhost
::1         localhost ip6-localhost
192.168.1.10 nas.local nas</code></pre>
      <p><code>/etc/resolv.conf</code> lists nameservers and search domains. On modern systems it is often a symlink managed by systemd-resolved, NetworkManager or a container runtime — editing it directly may be overwritten.</p>
      <pre><code>nameserver 1.1.1.1
nameserver 9.9.9.9
search example.com
options timeout:2 attempts:2</code></pre>
      <p><code>dig</code>, <code>host</code> and <code>nslookup</code> query DNS directly and bypass nsswitch. <code>getent hosts name</code> follows the full system path, which is what applications actually use. <code>systemd-resolved</code> listens on <code>127.0.0.53</code> and can be queried with <code>resolvectl query</code>.</p>
      <p>If a name resolves with <code>dig</code> but not in a browser, suspect nsswitch, search domains, a proxy, or a different resolver inside a container. Caching (systemd-resolved, nscd, dnsmasq) can also hide changes; flush the cache when testing DNS updates.</p>`,
      diagram: {
        type: 'flow',
        caption: 'How a Linux application resolves a hostname',
        items: [
          { t: 'Application', d: 'getaddrinfo()' },
          { t: 'nsswitch', d: 'files → dns' },
          { t: '/etc/hosts', d: 'static entries' },
          { t: 'Resolver', d: '127.0.0.53 or nameserver' },
          { t: 'DNS server', d: 'recursive lookup' }
        ]
      }
    },
    {
      id: 'ch9-ports',
      ref: '9.17',
      title: 'TCP, UDP and ports',
      html: `<p>IP delivers packets to a host. <strong>Ports</strong> identify the process inside that host. A socket is the tuple of protocol, local address, local port, remote address and remote port. The same port can be used by different protocols, and the same local port can serve many clients when each connection has a different remote tuple.</p>
      <pre><code>$ ss -tuln              # listening TCP/UDP sockets, numeric
$ ss -tp               # established TCP with process names
$ ss -s                # summary statistics
$ cat /etc/services     # well-known port assignments</code></pre>
      <p>Common ports: SSH 22, SMTP 25, DNS 53, HTTP 80, HTTPS 443, NTP 123, DHCP 67/68. Ports below 1024 are <strong>privileged</strong> on traditional Unix; a service needs root or <code>CAP_NET_BIND_SERVICE</code> to bind them. This is why reverse proxies often listen on 80/443 and forward to unprivileged app ports.</p>
      <p><strong>TCP</strong> is connection-oriented, ordered and reliable, with handshakes, acknowledgements and congestion control. <strong>UDP</strong> is connectionless and unreliable; applications add their own reliability if needed. DNS, DHCP, NTP, VoIP and many games use UDP; SSH, HTTP and most file transfer use TCP.</p>
      <p>Listening on <code>0.0.0.0</code> or <code>::</code> means all interfaces; listening on <code>127.0.0.1</code> restricts to local clients. That distinction is a common security bug: a database meant to be local but bound to every interface.</p>`
    },
    {
      id: 'ch9-dhcp',
      ref: '9.19–9.23',
      title: 'DHCP, NAT and routing between networks',
      html: `<p><strong>DHCP</strong> automatically supplies an address, prefix, gateway, DNS servers and lease time. The exchange is DORA: Discover (client broadcast), Offer (server), Request, Acknowledgement. Clients renew before the lease expires. A <code>169.254.x.x</code> address usually means no DHCP server answered.</p>
      <pre><code>$ nmcli device show wlan0 | grep -i dhcp
$ journalctl -u NetworkManager | grep -i dhcp
$ sudo dhclient -v eth0            # legacy client
$ ip addr show eth0</code></pre>
      <p><strong>NAT</strong> (network address translation) lets many private hosts share one public IPv4 address. A router rewrites source addresses/ports on outgoing packets and reverses the mapping for replies. Linux implements this with nftables or iptables masquerading and IP forwarding:</p>
      <pre><code>$ sudo sysctl -w net.ipv4.ip_forward=1
$ sudo nft add rule ip nat postrouting oifname "eth0" masquerade
$ sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE</code></pre>
      <p>To route between two subnets, the Linux host needs forwarding enabled, routes on both sides pointing at it, and firewall rules permitting the traffic. NAT is not a firewall; it happens to hide hosts, but it does not inspect or authorise traffic.</p>
      <p><strong>IPv6</strong> normally uses router advertisements and DHCPv6 or SLAAC rather than NAT. The prefix comes from the router; hosts form addresses from the prefix plus an interface identifier. Plan firewall policy for IPv6 explicitly — do not assume NAT will protect you.</p>`
    },
    {
      id: 'ch9-firewall',
      ref: '9.25–9.27',
      title: 'Firewalls and wireless',
      html: `<p>A firewall decides which packets may enter, leave or be forwarded. Linux's modern engine is <strong>nftables</strong>; <strong>iptables</strong> is the legacy interface, often emulated on top. Both use tables (filter, nat, mangle), chains and rules; nftables adds sets, maps and a cleaner syntax.</p>
      <pre><code>$ sudo nft list ruleset
$ sudo nft list tables
$ sudo iptables -L -n -v
$ sudo ufw status verbose        # Ubuntu front end
$ sudo firewall-cmd --list-all   # firewalld front end</code></pre>
      <p>A sound default policy is: drop inbound by default, allow established/related traffic, explicitly allow the services you need (SSH, HTTP, HTTPS), and restrict management access by source address where possible. Be careful not to lock yourself out of SSH — allow it before changing the default policy, and keep a console session open.</p>
      <p><strong>Wireless</strong> interfaces need association and authentication before IP. <code>iw dev</code> shows the interface and link; <code>iw dev wlan0 link</code> shows the access point, signal and bitrate. NetworkManager usually handles scanning and WPA2/WPA3. WPA3 and WPA2-Enterprise (802.1X) are preferable to open or WEP networks. Hidden SSIDs are not a security control.</p>
      <p>On the link layer, <strong>ARP</strong> maps IPv4 addresses to MAC addresses; <strong>NDP</strong> does the equivalent for IPv6. ARP spoofing is a LAN attack, mitigated by static entries, switch port security, or encrypted protocols such as HTTPS and SSH rather than by trusting the network.</p>`
    }
  ],
  commands: [
    { cmd: 'ip addr show', desc: 'Show interfaces, MAC addresses, IPv4/IPv6 addresses and state.' },
    { cmd: 'ip route show', desc: 'Print the IPv4 routing table, including the default gateway.' },
    { cmd: 'ip route get 1.1.1.1', desc: 'Show which interface, source address and gateway would be used.' },
    { cmd: 'ip -6 addr show', desc: 'Show IPv6 addresses and their scope.' },
    { cmd: 'ip neigh', desc: 'Show the ARP/NDP neighbour cache.' },
    { cmd: 'nmcli device status', desc: 'Show network devices and whether NetworkManager manages them.' },
    { cmd: 'nmcli connection show', desc: 'List saved connection profiles.' },
    { cmd: 'ping -c 4 1.1.1.1', desc: 'Test IP reachability (ICMP echo).' },
    { cmd: 'traceroute 1.1.1.1', desc: 'Show the path packets take across routers (if installed).' },
    { cmd: 'dig +short example.com', desc: 'Query DNS directly and print only answers.' },
    { cmd: 'getent hosts example.com', desc: 'Resolve a name through the system nsswitch path.' },
    { cmd: 'ss -tuln', desc: 'List listening TCP and UDP sockets with numeric addresses.' },
    { cmd: 'ss -tp', desc: 'Show established TCP connections with process names.' },
    { cmd: 'resolvectl status', desc: 'Show systemd-resolved DNS servers, search domains and link status.' },
    { cmd: 'sudo nft list ruleset', desc: 'Print the active nftables firewall rules.' },
    { cmd: 'iw dev wlan0 link', desc: 'Show the wireless association, signal and bitrate.' }
  ],
  labs: [
    {
      title: 'Decode your network',
      goal: 'Read addresses, prefixes and routes from the live system.',
      steps: [
        'Run <code>ip addr show</code> and identify one IPv4 address and prefix, plus any IPv6 link-local address.',
        'For your IPv4 address, calculate the network address, broadcast address and usable host range.',
        'Run <code>ip route</code> and identify the default gateway, interface and metric.',
        'Run <code>ip route get 8.8.8.8</code> and <code>ip route get 192.168.1.10</code>. Compare the decisions.',
        'Run <code>ip neigh</code> after pinging your gateway and identify the MAC address.'
      ]
    },
    {
      title: 'Follow a name and a connection',
      goal: 'Distinguish DNS from TCP connectivity.',
      steps: [
        'Run <code>getent hosts example.com</code>, then <code>dig +short example.com</code>. Do they agree?',
        'Run <code>ping -c 2 1.1.1.1</code> to test raw IP connectivity, then <code>ping -c 2 example.com</code> to test name resolution.',
        'Run <code>ss -tuln</code> and list every listening port. Identify which services own ports 22, 53 or 80 if present.',
        'Run <code>ss -tp</code> and find an established connection, if any. Which local and remote addresses form the socket?',
        'If <code>resolvectl status</code> works, identify the DNS servers and search domains for each link.'
      ]
    }
  ],
  cards: [
    { front: 'What does /24 mean?', back: 'The first 24 bits are the network prefix; the remaining 8 are host bits. It is 255.255.255.0, with 256 addresses and 254 usable hosts.' },
    { front: 'What is the default route?', back: 'The route used when no more specific prefix matches, written 0.0.0.0/0 (IPv4) or ::/0 (IPv6). It normally points at the local gateway.' },
    { front: 'What is the difference between TCP and UDP?', back: 'TCP is connection-oriented, ordered and reliable with handshakes and retransmission. UDP is connectionless and unreliable, leaving reliability to the application.' },
    { front: 'How does Linux resolve a hostname?', back: 'Through nsswitch.conf order, typically /etc/hosts first and then DNS via the resolvers in /etc/resolv.conf (often managed by systemd-resolved or NetworkManager).' },
    { front: 'What is DHCP DORA?', back: 'Discover, Offer, Request, Acknowledgement — the four-step exchange that assigns an address, prefix, gateway, DNS servers and lease.' },
    { front: 'What is NAT?', back: 'Network address translation rewrites source addresses/ports so private hosts can share a public IPv4 address. Linux uses masquerading plus IP forwarding.' },
    { front: 'A 169.254.x.x address usually means what?', back: 'Link-local autoconfiguration: the host did not get a DHCP lease. Check the DHCP server, VLAN, cable or Wi-Fi association.' },
    { front: 'Which command shows listening ports?', back: 'ss -tuln lists TCP/UDP listeners numerically; add -p to show owning processes (may require root).' }
  ],
  quiz: [
    {
      q: 'How many usable host addresses are in 192.168.4.0/24?',
      options: ['256', '254', '255', '512'],
      answer: 1,
      explain: 'A /24 has 8 host bits = 256 addresses, minus the network and broadcast addresses = 254 usable.'
    },
    {
      q: 'Which route does the kernel choose for a destination matching both 10.0.0.0/8 and 10.1.0.0/16?',
      options: ['The /8 route', 'The /16 route (longest prefix)', 'Randomly', 'The default route'],
      answer: 1,
      explain: 'Longest-prefix match wins: /16 is more specific than /8.'
    },
    {
      q: 'What does <code>ss -tuln</code> show?',
      options: [
        'All established connections only',
        'Listening TCP and UDP sockets, numeric addresses',
        'The routing table',
        'DNS cache entries'
      ],
      answer: 1,
      explain: '-t TCP, -u UDP, -l listening, -n numeric. Add -p for process details.'
    },
    {
      q: 'A host has an address of 169.254.10.20. What is the most likely explanation?',
      options: [
        'It is a public address.',
        'DHCP did not provide a lease, so link-local autoconfiguration took over.',
        'The default gateway is down.',
        'DNS is misconfigured.'
      ],
      answer: 1,
      explain: '169.254.0.0/16 is link-local. Hosts fall back to it when DHCP fails, which usually points to a layer-2 or DHCP-server problem.'
    },
    {
      q: 'Why must a service bind 0.0.0.0 when it should accept remote connections?',
      options: [
        '0.0.0.0 is the only valid address.',
        'It means all local interfaces; binding 127.0.0.1 would only accept local clients.',
        'It enables encryption.',
        'It sets the default gateway.'
      ],
      answer: 1,
      explain: 'Binding the loopback address restricts clients to the same host. Binding all interfaces exposes the port on every interface, which must be paired with firewall policy.'
    },
    {
      q: 'What does NAT do to outgoing packets?',
      options: [
        'Encrypts them',
        'Rewrites source addresses and ports, tracking mappings for replies',
        'Adds a second IP header',
        'Drops all inbound traffic'
      ],
      answer: 1,
      explain: 'Masquerading rewrites the source tuple so replies can be translated back. It is not encryption or a substitute for a firewall.'
    }
  ]
});
