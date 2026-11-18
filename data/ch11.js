window.HLW.chapters.push({
  id: 11,
  title: 'Introduction to Shell Scripts',
  short: 'Shell scripts',
  track: 'network',
  ref: 'Chapter 11',
  sectionsRef: '11.1–11.14',
  minutes: 50,
  tagline: 'Automate the small, repeatable, dangerous parts — carefully.',
  blurb: 'Write portable shell scripts with correct quoting, arguments, exit codes, tests, loops and temporary files. Learn the utilities that make scripts robust.',
  objectives: [
    'Write and execute a POSIX-style shell script with a shebang.',
    'Quote expansions correctly and use positional parameters safely.',
    'Branch on exit codes and test conditions, including file tests.',
    'Loop over arguments and input, substitute command output, and clean up with traps.',
    'Know when a shell script is the wrong tool.'
  ],
  sections: [
    {
      id: 'ch11-basics',
      ref: '11.1, 11.3',
      title: 'Script basics and special variables',
      html: `<p>A shell script is a text file of commands executed by a shell. The first line, the <strong>shebang</strong>, names the interpreter: <code>#!/bin/sh</code> for POSIX shell portability or <code>#!/bin/bash</code> for bash features. Make it executable and run it by path.</p>
      <pre><code>#!/bin/sh
# greet.sh — print a greeting
printf 'Hello, %s\\n' "$1"</code></pre>
      <pre><code>$ chmod +x greet.sh
$ ./greet.sh world</code></pre>
      <p>Positional parameters are the arguments: <code>$1</code>, <code>$2</code>, and so on. <code>$#</code> is the count, <code>$@</code> expands to all arguments as separate words, <code>$0</code> is the script name, <code>$$</code> is the shell PID and <code>$?</code> is the exit status of the last command. Quote <code>"$@"</code> almost always.</p>
      <p>Variables are assigned without spaces: <code>name=value</code>. Read with <code>$name</code> or <code>"$name"</code>. Export with <code>export name</code> to pass it to child processes. The shell does not require declarations, but it will happily expand an unset variable to an empty string unless you enable strict mode.</p>
      <pre><code>#!/bin/sh
set -eu
name=$1
printf 'Hello, %s\\n' "$name"</code></pre>
      <p><code>set -e</code> exits on an unhandled failing command; <code>set -u</code> errors on unset variables. For bash, <code>set -o pipefail</code> also catches failures in the middle of a pipeline. These are safety nets, not a substitute for explicit error handling.</p>`
    },
    {
      id: 'ch11-quoting',
      ref: '11.2',
      title: 'Quoting and literals',
      html: `<p>Quoting controls expansion. Getting it wrong is the most common source of shell bugs, especially with filenames containing spaces.</p>
      <ul>
        <li><strong>Unquoted</strong>: word splitting and glob expansion happen. <code>$file</code> can become multiple arguments or a pathname match.</li>
        <li><strong>Double quotes</strong>: variables and command substitutions expand, but word splitting and globbing do not. Use <code>"$file"</code>.</li>
        <li><strong>Single quotes</strong>: everything is literal, including <code>$</code>, backticks and backslashes. Use for fixed strings.</li>
        <li><strong>Backslash</strong>: escapes the next character outside single quotes.</li>
      </ul>
      <pre><code>file="my report.txt"
rm "$file"                 # correct: one argument
echo 'cost: $100'          # literal $100
echo "cost: $100"          # tries to expand $1 followed by 00
echo "today is $(date)"    # command substitution inside double quotes</code></pre>
      <p>To put a literal single quote inside single quotes, close, escape, reopen: <code>'It'\\''s fine'</code>. For arbitrary data, prefer passing it through a file or a heredoc rather than building a quoted command string.</p>
      <p>Never use <code>eval</code> on untrusted input. Do not build commands by concatenating user-supplied strings; pass arguments as separate words.</p>`
    },
    {
      id: 'ch11-conditionals',
      ref: '11.4–11.5',
      title: 'Exit codes and conditionals',
      html: `<p>Every command returns an exit status: 0 means success, non-zero means failure. The shell branches on that status. <code>if</code> runs a command (often <code>test</code>) and checks its exit code — it does not read a boolean value.</p>
      <pre><code>if grep -q '^root:' /etc/passwd; then
    echo "root exists"
elif [ -f /etc/debian_version ]; then
    echo "Debian-like system"
else
    echo "something else"
fi</code></pre>
      <p><code>[</code> is a command (also called <code>test</code>); it requires spaces around brackets and a closing <code>]</code>. Bash's <code>[[ ]]</code> is a safer extended form with pattern matching and no word splitting. Common file tests: <code>-e</code> exists, <code>-f</code> regular file, <code>-d</code> directory, <code>-r</code> readable, <code>-w</code> writable, <code>-x</code> executable, <code>-s</code> non-empty. String tests use <code>=</code> and <code>!=</code>; numeric tests use <code>-eq</code>, <code>-ne</code>, <code>-lt</code>, <code>-gt</code>.</p>
      <pre><code>[ "$count" -gt 10 ] &amp;&amp; echo "many"
[ -d "$dir" ] || mkdir -p "$dir"
[ "$a" = "$b" ] &amp;&amp; [ "$c" = "$d" ]</code></pre>
      <p><code>&amp;&amp;</code> runs the next command only on success; <code>||</code> runs it only on failure. Use <code>case</code> for multi-way string matching:</p>
      <pre><code>case "$1" in
    start|stop) systemctl "$1" myservice ;;
    status)     systemctl status myservice ;;
    *)          echo "usage: $0 {start|stop|status}" &gt;&amp;2; exit 2 ;;
esac</code></pre>`
    },
    {
      id: 'ch11-loops',
      ref: '11.6',
      title: 'Loops',
      html: `<p><code>for</code> iterates over a list of words; <code>while</code> repeats while a command succeeds. Quote lists to preserve arguments and avoid accidental globbing.</p>
      <pre><code>for file in *.txt; do
    [ -e "$file" ] || continue
    printf '%s\\n' "$file"
done

for arg in "$@"; do
    printf 'argument: %s\\n' "$arg"
done

while IFS= read -r line; do
    printf 'line: %s\\n' "$line"
done &lt; input.txt</code></pre>
      <p><code>IFS= read -r line</code> preserves leading/trailing whitespace and backslashes. Do not use <code>for line in $(cat file)</code>: it splits on whitespace and glob-expands, corrupting input.</p>
      <p><code>break</code> exits the loop; <code>continue</code> skips to the next iteration. A <code>while true</code> loop needs a deliberate exit or it will run forever. Pipelines run each component in a subshell, so variables set inside a piped <code>while</code> may not survive outside it; use redirection or bash process substitution when that matters.</p>
      <pre><code>while read -r user; do
    printf 'user: %s\\n' "$user"
done &lt; users.txt</code></pre>`
    },
    {
      id: 'ch11-substitution',
      ref: '11.7–11.9',
      title: 'Command substitution, here documents and temp files',
      html: `<p><strong>Command substitution</strong> captures a command's output: <code>today=$(date +%F)</code>. Quote the result unless you deliberately want word splitting. Backticks are the legacy form; <code>$(...)</code> nests and reads better.</p>
      <pre><code>kernel=$(uname -r)
count=$(wc -l &lt; file.txt)
printf 'kernel=%s lines=%s\\n' "$kernel" "$count"</code></pre>
      <p><strong>Arithmetic</strong> uses <code>$((...))</code>: <code>total=$((a + b))</code>. <strong>Reading input</strong> uses <code>read -r var</code>, ideally with a prompt on stderr: <code>read -r -p "Name: " name</code>.</p>
      <p>A <strong>here document</strong> feeds a block of text to a command. Quote the delimiter to prevent expansion:</p>
      <pre><code>cat &lt;&lt;'EOF' &gt; config.txt
name=example
path=/var/lib/example
EOF</code></pre>
      <p>For temporary files, use <code>mktemp</code> — never a predictable name in <code>/tmp</code>. Clean up with a <code>trap</code> so the file is removed even on failure or interrupt.</p>
      <pre><code>tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT INT TERM
printf 'working...\\n' &gt; "$tmp"</code></pre>
      <p>For temporary directories use <code>mktemp -d</code>. Set restrictive permissions when the content is sensitive.</p>`
    },
    {
      id: 'ch11-utilities',
      ref: '11.10–11.12',
      title: 'Script utilities and composition',
      html: `<p>Shell scripts glue together specialised programs. These are the ones worth knowing well:</p>
      <ul>
        <li><code>basename path</code> and <code>dirname path</code> split a path; <code>basename -s .txt file.txt</code> strips a suffix.</li>
        <li><code>sed 's/old/new/g' file</code> edits a stream; <code>sed -i</code> edits in place (make a backup: <code>sed -i.bak</code>).</li>
        <li><code>awk '{print $1, $3}' file</code> selects fields; awk is a small programming language for records and columns.</li>
        <li><code>xargs</code> turns stdin into arguments: <code>find . -name '*.tmp' -print0 | xargs -0 rm</code>.</li>
        <li><code>expr</code> evaluates simple expressions; prefer shell arithmetic for numbers.</li>
        <li><code>exec command</code> replaces the shell process, useful for a final handoff in a wrapper script.</li>
        <li><code>. file</code> or <code>source file</code> runs a script in the current shell, so variables persist. Executing it normally runs a child shell.</li>
      </ul>
      <p><strong>Subshells</strong> <code>( ... )</code> isolate state: changes to variables, working directory and traps do not affect the parent. Braces <code>{ ...; }</code> group commands in the current shell but require a semicolon or newline before the closing brace.</p>
      <p>Keep scripts readable: functions, <code>usage()</code>, clear variable names, comments explaining why (not what), and <code>printf</code> instead of <code>echo</code> for portable output. <code>shellcheck</code> catches many quoting and portability bugs before they bite.</p>`
    },
    {
      id: 'ch11-when',
      ref: '11.13–11.14',
      title: 'Robust scripts and when not to use shell',
      html: `<p>Production scripts should fail loudly and clean up. A practical template:</p>
      <pre><code>#!/bin/sh
set -eu

usage() {
    printf 'usage: %s &lt;source&gt; &lt;destination&gt;\\n' "$0" &gt;&amp;2
    exit 2
}

[ "$#" -eq 2 ] || usage
src=$1
dst=$2
[ -d "$src" ] || { printf 'not a directory: %s\\n' "$src" &gt;&amp;2; exit 1; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

cp -a "$src"/. "$tmp"/
mv "$tmp" "$dst"
printf 'done\\n'</code></pre>
      <p>Shell is excellent for orchestrating commands, files and processes. It is a poor choice for complex data structures, heavy string processing, precise numeric work, or anything requiring libraries. At that point, use Python, Go, Rust or another language with proper error handling and tests.</p>
      <p>Avoid parsing <code>ls</code> output; use globs, <code>find -print0</code> and <code>while read</code>. Avoid <code>eval</code>. Avoid unquoted variables. Check every assumption about paths, permissions and available commands. Test with spaces in filenames, empty input and missing arguments.</p>
      <div class="callout key"><span class="co-ico">★</span><div><div class="co-title">The shell script test</div><p>If you cannot explain what happens when a filename contains a space, a newline or a leading dash, the script is not finished.</p></div></div>`
    }
  ],
  commands: [
    { cmd: '#!/bin/sh', desc: 'Shebang line selecting the POSIX shell interpreter.' },
    { cmd: 'chmod +x script.sh', desc: 'Make a script executable.' },
    { cmd: 'set -eu', desc: 'Exit on unhandled command failure and on expansion of unset variables.' },
    { cmd: 'printf \'%s\\n\' "$var"', desc: 'Portable, predictable output with one argument per line.' },
    { cmd: '[ -f "$file" ]', desc: 'Test whether a path is a regular file.' },
    { cmd: 'case "$1" in start) ... ;; esac', desc: 'Match a string against multiple patterns.' },
    { cmd: 'for f in "$@"; do ...; done', desc: 'Iterate over all script arguments without word splitting.' },
    { cmd: 'while IFS= read -r line; do ...; done < file', desc: 'Read a file line by line, preserving whitespace.' },
    { cmd: 'result=$(command)', desc: 'Capture command output; quote it when using the result.' },
    { cmd: 'total=$((a + b))', desc: 'Perform shell arithmetic.' },
    { cmd: 'tmp=$(mktemp)', desc: 'Create a unique temporary file safely.' },
    { cmd: 'trap \'rm -f "$tmp"\' EXIT', desc: 'Clean up a temporary file when the script exits.' },
    { cmd: 'cat <<\'EOF\' > file', desc: 'Write a heredoc with no variable expansion.' },
    { cmd: 'find . -name "*.tmp" -print0 | xargs -0 rm', desc: 'Safely handle filenames containing spaces or newlines.' },
    { cmd: 'bash -n script.sh', desc: 'Syntax-check a script without executing it.' },
    { cmd: 'shellcheck script.sh', desc: 'Static analysis for common shell bugs (if installed).' }
  ],
  labs: [
    {
      title: 'Write a safe rename script',
      goal: 'Practise quoting, argument validation, tests and loops.',
      steps: [
        'Create <code>renamer.sh</code> that takes a directory and a suffix, and renames matching files with a prefix.',
        'Add <code>#!/bin/sh</code>, <code>set -eu</code>, a usage function and a check that the directory exists.',
        'Loop over <code>"$dir"/*."$suffix"</code> and use <code>printf</code> to show old and new names before changing anything.',
        'Test it on a sandbox containing a filename with spaces and a filename beginning with a dash.',
        'Run <code>bash -n renamer.sh</code> and, if available, <code>shellcheck renamer.sh</code>. Fix every warning you understand.'
      ]
    },
    {
      title: 'Write a backup script with cleanup',
      goal: 'Combine mktemp, trap, command substitution and error handling.',
      steps: [
        'Create a script that archives a source directory into a timestamped tar.gz in a destination.',
        'Validate both arguments, create the destination with <code>mkdir -p</code>, and compute the timestamp with <code>$(date +%Y%m%d-%H%M%S)</code>.',
        'Use a temporary directory and a <code>trap</code> to remove it on EXIT.',
        'Fail with a clear message to stderr if the source is missing or the archive cannot be created.',
        'Test success, missing arguments and a missing source. Confirm the trap cleaned up.'
      ]
    }
  ],
  cards: [
    { front: 'What is a shebang?', back: 'The first line of a script, such as #!/bin/sh, naming the interpreter the kernel should execute.' },
    { front: 'Why quote "$@"?', back: 'It expands each positional parameter as a separate word, preserving spaces and avoiding glob expansion.' },
    { front: 'Exit code 0 means what?', back: 'Success. Any non-zero status indicates failure; the shell uses it for if, while, && and ||.' },
    { front: 'What does set -e do?', back: 'Exit immediately when a command fails, unless it is part of a condition or explicitly guarded. It is a safety net, not full error handling.' },
    { front: 'How do you safely create a temp file?', back: 'Use mktemp, store the path in a variable, restrict permissions if needed, and remove it with a trap on EXIT.' },
    { front: 'Why not parse ls output?', back: 'Filenames can contain spaces, newlines and special characters. Use globs, find -print0 with xargs -0, or shell loops instead.' },
    { front: 'exec vs source', back: 'exec replaces the current shell process with a command. source (or .) runs a file in the current shell so variables and functions persist.' }
  ],
  quiz: [
    {
      q: 'Which expansion preserves a filename containing spaces?',
      options: ['$file', '$"file"', '"$file"', '`$file`'],
      answer: 2,
      explain: 'Double quotes prevent word splitting and globbing while still expanding the variable. Unquoted $file can split into multiple arguments.'
    },
    {
      q: 'What does <code>if grep -q pattern file; then</code> test?',
      options: [
        'Whether grep printed a matching line',
        'Whether grep exited with status 0, meaning it found a match',
        'Whether the file is empty',
        'Whether the pattern is a valid regular expression'
      ],
      answer: 1,
      explain: 'if evaluates the command exit status. grep -q suppresses output and returns 0 on a match, non-zero otherwise.'
    },
    {
      q: 'Why is <code>for line in $(cat file)</code> a bad idea?',
      options: [
        'cat cannot read files',
        'It splits on whitespace and glob-expands, corrupting lines with spaces or wildcards',
        'It is slower than a while loop only on Linux',
        'It changes the file permissions'
      ],
      answer: 1,
      explain: 'Unquoted command substitution undergoes word splitting and pathname expansion. Use while IFS= read -r line; do ... done < file.'
    },
    {
      q: 'What does <code>trap \'rm -f "$tmp"\' EXIT</code> do?',
      options: [
        'Deletes the script on exit',
        'Runs the rm command when the shell exits, cleaning up the temp file',
        'Ignores all signals',
        'Creates a temporary directory'
      ],
      answer: 1,
      explain: 'trap registers a handler for EXIT (and often INT/TERM). It ensures cleanup on normal exit or interruption.'
    },
    {
      q: 'When is a shell script a poor choice?',
      options: [
        'Renaming files',
        'Wrapping system commands',
        'Complex data structures, heavy computation or large applications',
        'Running a sequence of commands'
      ],
      answer: 2,
      explain: 'Shell excels at orchestration. For complex data, precise numeric work, or large programs, use a language with better abstractions, libraries and testing.'
    }
  ]
});
