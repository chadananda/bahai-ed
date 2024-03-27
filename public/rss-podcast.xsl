<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
    <xsl:output method="html" version="1.0" encoding="ISO-8859-1" indent="yes"/>
    <xsl:template match="/">

        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title><xsl:value-of select="/rss/channel/title"/> - RSS</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <style type="text/css">
                	@import url('https://fonts.googleapis.com/css?family=Montserrat:300,400,500,600');
                    @import url("https://use.fontawesome.com/releases/v5.8.1/css/all.css");

                    body {
                        font-family: 'Montserrat', sans-serif;
                        font-size: 14px;
                        color: #545454;
                        background: #E5E5E5;
                        line-height: 1.5;
                    }
                    .explanation {
                        font-style: italic;
                        font-size: 10px;
                        color: #9E9E9E;
                        text-align: center;
                    }
                    a, a:link, a:visited {
                        color: #005C82;
                        text-decoration: none;
                    }
                    a:hover {
                        color: #000;
                    }
                    h1 {
                   		margin-top: 0;
                   		 margin-bottom: 0;
                   		 font-weight: 300;
                   		 font-size: xx-large;
                    }

                    h2, h3 {
                        margin-top: 0;
                        margin-bottom: 0px;
                        font-weight:300;
                    }
                    h2 {
                    	margin-top: 20px;
                    }

                    h3 {
                    	font-size:small;
                    	font-weight: 500;
                    }

                    img {
                    max-width: 100%;
                    }

                    #content {
                        max-width: 900px;
                        margin: 0 auto;
                        background: #FFF;
                        padding: 30px;
                        border-radius: 1em;
                        padding-top: 0px;
                        box-shadow: 0px 0px 2px #5D5D5D;
                    }
                    #channel-image {
                        float: right;
                        width: 200px;
                        margin-bottom: 20px;
                    }
                    #channel-image img {
                        width: 200px;
                        height: auto;
                        border-radius: 3px;
                        margin-left: 10px;
                    }
                    #channel-header {
                        margin-bottom: 20px;
                        padding-top: 20px;
                        margin-left: -10px;
                    }
                    .channel-item {
                        clear: both;
                        border-top: 2px solid #E5E5E5;
                        margin: 10px;
                        overflow-wrap: break-word;
  						word-wrap: break-word;
  						hyphens: auto;
                    }

                    .episode-image {
                         float: left;
   						 width: 100px;
  						 margin-right: 10px;
  						 margin-bottom: 10px;
  					     margin-top: 10px;

                    }

                    .episode-image img {
                        width: 100px;
                        height: auto;
                        border-radius: 5px;
                    }

                    .episode-title {
                        margin-bottom:20px;
                    }

                    .episode_meta {
                        font-size: 11px;
                        font-weight: 500;
                        margin-top: 20px;
                        margin-bottom: 10px;
                    }
                    .channel-description {
						margin-bottom: 10px;
						overflow-wrap: break-word;
  						word-wrap: break-word;
  						hyphens: auto;

                    }
                     .channel-copyright {
                     	 	 text-align: center;
   							 margin: 10px;
   							 font-size: small;

                    }
                     .channel-author {
   						 font-size: small;
  					     font-weight: 600;
  					     margin-bottom: 10px;
                    }
                     .channel-subtitle {
   						 font-size: small;
  					     font-weight: 500;
  					     margin-bottom: 20px;
                    }
                    .fa, .far, .fas {
                         font-family: "Font Awesome 5 Free";
                         margin-left: 5px;
                         margin-right: 5px;
                         display: initial;
                    }
                </style>
            </head>
            <body>
            	<p class="explanation">
                        This is a podcast RSS feed. It is meant for consumption by podcast feed readers using the URL in the address bar.
                    </p>
                <div id="content">

                    <div id="channel-header">
                        <h1>
                            <xsl:if test="/rss/channel/image">
                                <div id="channel-image">
                                    <img>
                                            <xsl:attribute name="src">
                                                <xsl:value-of select="/rss/channel/image/url"/>
                                            </xsl:attribute>
                                            <xsl:attribute name="title">
                                                <xsl:value-of select="/rss/channel/image/title"/>
                                            </xsl:attribute>
                                        </img>
                                </div>
                            </xsl:if>
                            <xsl:value-of select="/rss/channel/title"/>
                        </h1>
                        <div class="channel-subtitle">
                            <xsl:value-of select="/rss/channel/itunes:subtitle" disable-output-escaping="yes"/>
                        </div>
                        <div class="channel-description">
                            <xsl:value-of select="/rss/channel/description" disable-output-escaping="yes"/>
                        </div>
                        <div class="channel-author">
                            <xsl:value-of select="/rss/channel/itunes:author" disable-output-escaping="yes"/>
 						<a style="font-size: large;font-weight: 600;">
                                <xsl:attribute name="href">
                                    <xsl:value-of select="/rss/channel/link"/>
                                </xsl:attribute>
                                <xsl:attribute name="target">_blank</xsl:attribute>
                                <i class="fas fa-globe"></i>
                                <xsl:value-of select="/rss/channel/title"/> Website
                            </a>
                        </div>

                    </div>
                    <xsl:for-each select="/rss/channel/item">
                        <div class="channel-item">
                           <div class="episode-title">
                            <h2>
                                <a>
                                    <xsl:attribute name="href">
                                        <xsl:value-of select="link"/>
                                    </xsl:attribute>

                                    <xsl:attribute name="target">_blank</xsl:attribute>
                                    <xsl:value-of select="title"/>
                                </a>
                                <div class="episode-image">
                           			 <img>
                                            <xsl:attribute name="src">
                                                <xsl:value-of select="itunes:image/@href"/>
                                            </xsl:attribute>
                                            <xsl:attribute name="title">
                                                <xsl:value-of select="title"/>
                                            </xsl:attribute>
                           			  </img>
                         		</div>
                            </h2>
                            <h3>
                         		 <xsl:if test="itunes:author">
                               		 <xsl:value-of select="itunes:author" disable-output-escaping="yes"/>
                               	 </xsl:if>
                         	</h3>
                           </div>

                         	<div class="episode-description">

                            <xsl:if test="description">
                                <p>
                                    <xsl:value-of select="description" disable-output-escaping="yes"/>
                                </p>
                            </xsl:if>

                        	</div>
                            <p class="episode_meta">
                                    <a>
                                        <xsl:attribute name="href">
                                            <xsl:value-of select="enclosure/@url"/>?ref=new_window
                                        </xsl:attribute>
                                        <xsl:attribute name="target">_blank</xsl:attribute>
                                        <i class="fas fa-download"></i>
                                        <xsl:value-of select='format-number(number(enclosure/@length div "1024000"),"0.0")'/>MB
                                    </a> | <i class="fas fa-stopwatch"></i>
                                    <xsl:value-of select="itunes:duration" disable-output-escaping="yes"/> | <i class="far fa-calendar"></i>

                                    <xsl:value-of select="pubDate" />
                            </p>
                        </div>
                    </xsl:for-each>
                </div>
                <div class="channel-copyright">
                	&#x24B8; <xsl:value-of select="/rss/channel/copyright"/>
            	</div>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>